import OpenAI from "openai";

export type ContractorOption = {
  id: string;
  name: string;
  trades: string[];
  priority: number;
  active: boolean;
};

export type TicketAi = {
  title: string;
  urgency: "Emergency" | "Urgent" | "Routine";
  recommended_trade: string;
  summary_for_landlord: string;
  summary_for_contractor: string;
  missing_information: string[];
  recommended_contractor_id: string | null;
  dispatch_confidence: number;
  recommended_next_step: string;
};

export async function analyzeTicket(input: {
  propertyAddress: string;
  unit: string;
  category: string;
  description: string;
  emergencyFlag: boolean;
  activeWaterLeak: boolean;
  gasSmell: boolean;
  electricalSparking: boolean;
  permissionToEnter: boolean;
  petsPresent: boolean;
  availabilityWindows: string;
  contractors: ContractorOption[];
}): Promise<TicketAi> {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackAnalysis(input);
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Analyze a tenant maintenance request for a small landlord. Return structured JSON only with title, urgency, recommended_trade, summary_for_landlord, summary_for_contractor, missing_information, recommended_contractor_id, dispatch_confidence, recommended_next_step. Urgency must be Emergency, Urgent, or Routine. If gas smell, active flooding, fire, sparking electrical, lockout, or security issue is present, mark Emergency. If no matching active contractor exists, recommended_contractor_id must be null. Never promise repair timing."
        },
        {
          role: "user",
          content: JSON.stringify(input)
        }
      ]
    });

    const parsed = JSON.parse(response.choices[0]?.message.content ?? "{}") as Partial<TicketAi>;
    const fallback = fallbackAnalysis(input);
    return {
      title: parsed.title || fallback.title,
      urgency: normalizeUrgency(parsed.urgency) || fallback.urgency,
      recommended_trade: parsed.recommended_trade || fallback.recommended_trade,
      summary_for_landlord: parsed.summary_for_landlord || fallback.summary_for_landlord,
      summary_for_contractor: parsed.summary_for_contractor || fallback.summary_for_contractor,
      missing_information: Array.isArray(parsed.missing_information) ? parsed.missing_information : fallback.missing_information,
      recommended_contractor_id:
        parsed.recommended_contractor_id && input.contractors.some((contractor) => contractor.id === parsed.recommended_contractor_id)
          ? parsed.recommended_contractor_id
          : fallback.recommended_contractor_id,
      dispatch_confidence: typeof parsed.dispatch_confidence === "number" ? parsed.dispatch_confidence : fallback.dispatch_confidence,
      recommended_next_step: parsed.recommended_next_step || fallback.recommended_next_step
    };
  } catch (error) {
    console.error("OpenAI ticket analysis failed. Using fallback analysis.", error);
    return fallbackAnalysis(input);
  }
}

function fallbackAnalysis(input: Parameters<typeof analyzeTicket>[0]): TicketAi {
  const urgency: TicketAi["urgency"] =
    input.emergencyFlag || input.gasSmell || input.electricalSparking || input.activeWaterLeak || /flood|fire|lockout|break.?in/i.test(input.description)
      ? "Emergency"
      : /no heat|no hot water|leak|sewer|toilet|outage/i.test(input.description)
        ? "Urgent"
        : "Routine";
  const trade = inferTrade(input.category, input.description);
  const contractor = input.contractors
    .filter((option) => option.active)
    .sort((a, b) => a.priority - b.priority)
    .find((option) => option.trades.some((item) => item.toLowerCase() === trade.toLowerCase()));

  return {
    title: `${input.category} issue in Unit ${input.unit}`,
    urgency,
    recommended_trade: trade,
    summary_for_landlord: `Tenant reports: ${input.description}`,
    summary_for_contractor: `${input.category} request at ${input.propertyAddress}, Unit ${input.unit}. ${input.description}. Availability: ${input.availabilityWindows || "Not provided"}. Permission to enter: ${input.permissionToEnter ? "yes" : "no"}. Pets present: ${input.petsPresent ? "yes" : "no"}.`,
    missing_information: input.availabilityWindows ? [] : ["Tenant availability"],
    recommended_contractor_id: contractor?.id ?? null,
    dispatch_confidence: contractor ? 0.76 : 0.34,
    recommended_next_step: contractor ? `Send to ${contractor.name} for scheduling.` : `Add or select a ${trade} contractor before dispatch.`
  };
}

function inferTrade(category: string, description: string) {
  const text = `${category} ${description}`.toLowerCase();
  if (/sink|toilet|pipe|drain|leak|water|sewer|plumb/.test(text)) return "Plumbing";
  if (/outlet|breaker|spark|light|electric/.test(text)) return "Electrical";
  if (/heat|air|ac|hvac|furnace/.test(text)) return "HVAC";
  if (/fridge|oven|stove|washer|dryer|dishwasher|appliance/.test(text)) return "Appliance";
  if (/bug|roach|rodent|pest/.test(text)) return "Pest";
  if (/roof|ceiling/.test(text)) return "Roofing";
  return category || "General";
}

function normalizeUrgency(value: unknown): TicketAi["urgency"] | null {
  if (value === "Emergency" || value === "Urgent" || value === "Routine") return value;
  return null;
}

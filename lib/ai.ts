import OpenAI from "openai";

export type TicketAi = {
  title: string;
  category: string;
  urgency: "low" | "medium" | "high" | "emergency";
  summary: string;
  missing_info: string[];
  tenant_follow_up: string;
  contractor_message: string;
};

export async function analyzeTicket(input: {
  requestType: string;
  description: string;
  propertyAddress: string;
  unitNumber?: string | null;
  availabilityWindows: string;
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
            "You are an AI maintenance coordinator for rental properties. Return only JSON with title, category, urgency, summary, missing_info, tenant_follow_up, contractor_message. urgency must be low, medium, high, or emergency."
        },
        {
          role: "user",
          content: JSON.stringify(input)
        }
      ]
    });

    const parsed = JSON.parse(response.choices[0]?.message.content ?? "{}") as Partial<TicketAi>;
    return {
      title: parsed.title || `${input.requestType} request`,
      category: parsed.category || input.requestType,
      urgency: parsed.urgency || "medium",
      summary: parsed.summary || input.description,
      missing_info: Array.isArray(parsed.missing_info) ? parsed.missing_info : [],
      tenant_follow_up: parsed.tenant_follow_up || "",
      contractor_message: parsed.contractor_message || parsed.summary || input.description
    };
  } catch (error) {
    console.error("OpenAI ticket analysis failed. Using fallback analysis.", error);
    return fallbackAnalysis(input);
  }
}

function fallbackAnalysis(input: {
  requestType: string;
  description: string;
  propertyAddress: string;
  unitNumber?: string | null;
  availabilityWindows: string;
}): TicketAi {
  return {
    title: `${input.requestType} at ${input.unitNumber ? `Unit ${input.unitNumber}` : input.propertyAddress}`,
    category: input.requestType,
    urgency: input.description.toLowerCase().match(/flood|leak|no heat|sparks|gas|sewer/) ? "high" : "medium",
    summary: input.description,
    missing_info: input.availabilityWindows ? [] : ["Tenant availability"],
    tenant_follow_up: "Thanks for submitting the request. The landlord will review the issue and coordinate next steps.",
    contractor_message: `${input.requestType}: ${input.description}. Availability: ${input.availabilityWindows || "Not provided"}.`
  };
}

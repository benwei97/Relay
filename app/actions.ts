"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { analyzeTicket } from "@/lib/ai";
import { sendContractorEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

const storageBucket = "ticket-files";
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const status = {
  submitted: "Submitted",
  triageComplete: "AI Triage Complete",
  needsReview: "Needs Landlord Review",
  sent: "Sent to Contractor",
  accepted: "Contractor Accepted",
  declined: "Contractor Declined",
  scheduling: "Scheduling",
  scheduled: "Scheduled",
  inProgress: "In Progress",
  completed: "Completed",
  closed: "Closed",
  needsAttention: "Needs Attention",
  emergency: "Emergency Escalated"
};

export async function signIn(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function currentLandlord() {
  const server = await createSupabaseServerClient();
  const {
    data: { user }
  } = await server.auth.getUser();

  if (!user) redirect("/login");

  const admin = createSupabaseAdminClient();
  const { data: landlord, error } = await admin
    .from("landlords")
    .upsert({ user_id: user.id, email: user.email ?? null }, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return landlord;
}

async function addEvent(input: {
  ticketId: string;
  type: string;
  message: string;
  actorType: "tenant" | "landlord" | "contractor" | "ai" | "system";
  actorId?: string;
}) {
  const supabase = createSupabaseAdminClient();
  await supabase.from("ticket_events").insert({
    ticket_id: input.ticketId,
    type: input.type,
    message: input.message,
    actor_type: input.actorType,
    actor_id: input.actorId
  });
}

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "property"}-${randomUUID().slice(0, 8)}`;
}

export async function addProperty(formData: FormData) {
  const landlord = await currentLandlord();
  const supabase = createSupabaseAdminClient();
  const name = String(formData.get("name") || "");
  const address = String(formData.get("address") || "");

  const { error } = await supabase
    .from("properties")
    .insert({
      landlord_id: landlord.id,
      name,
      address,
      access_notes: String(formData.get("access_notes") || "") || null,
      parking_notes: String(formData.get("parking_notes") || "") || null,
      request_link_slug: slugify(name || address)
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/properties");
  revalidatePath("/dashboard");
}

export async function addContractor(formData: FormData) {
  const landlord = await currentLandlord();
  const supabase = createSupabaseAdminClient();
  const trades = formData.getAll("trades").map(String).filter(Boolean);

  const { error } = await supabase.from("contractors").insert({
    landlord_id: landlord.id,
    name: String(formData.get("name") || ""),
    company_name: String(formData.get("company_name") || "") || null,
    phone: String(formData.get("phone") || ""),
    email: String(formData.get("email") || "") || null,
    trades,
    priority: Number(formData.get("priority") || 1),
    active: formData.get("active") === "on"
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/contractors");
}

export async function createTicket(formData: FormData) {
  const supabase = createSupabaseAdminClient();
  const propertySlug = String(formData.get("property_slug") || "");
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("*")
    .eq("request_link_slug", propertySlug)
    .single();
  if (propertyError) throw new Error(propertyError.message);

  const unitNumber = String(formData.get("unit_number") || "");
  const tenantName = String(formData.get("tenant_name") || "");
  const tenantPhone = String(formData.get("tenant_phone") || "");
  const tenantEmail = String(formData.get("tenant_email") || "") || null;
  const category = String(formData.get("category") || "");
  const description = String(formData.get("description") || "");
  const availabilityWindows = String(formData.get("availability_windows") || "");
  const emergencyFlag = formData.get("emergency_flag") === "on";
  const activeWaterLeak = formData.get("active_water_leak") === "on";
  const gasSmell = formData.get("gas_smell") === "on";
  const electricalSparking = formData.get("electrical_sparking") === "on";
  const permissionToEnter = formData.get("permission_to_enter") === "on";
  const petsPresent = formData.get("pets_present") === "on";

  if (!tenantName || !tenantPhone || !unitNumber || !category || !description) {
    throw new Error("Missing required maintenance request fields");
  }

  const { data: unit } = await supabase
    .from("units")
    .upsert({ property_id: property.id, unit_number: unitNumber }, { onConflict: "property_id,unit_number" })
    .select("id")
    .single();

  const { data: contractors } = await supabase
    .from("contractors")
    .select("id,name,trades,priority,active")
    .eq("landlord_id", property.landlord_id)
    .eq("active", true);

  const ai = await analyzeTicket({
    propertyAddress: property.address,
    unit: unitNumber,
    category,
    description,
    emergencyFlag,
    activeWaterLeak,
    gasSmell,
    electricalSparking,
    permissionToEnter,
    petsPresent,
    availabilityWindows,
    contractors: contractors ?? []
  });

  const ticketStatus = ai.urgency === "Emergency" ? status.emergency : status.needsReview;
  const { data: ticket, error } = await supabase
    .from("maintenance_tickets")
    .insert({
      landlord_id: property.landlord_id,
      property_id: property.id,
      unit_id: unit?.id ?? null,
      tenant_name: tenantName,
      tenant_phone: tenantPhone,
      tenant_email: tenantEmail,
      unit_number: unitNumber,
      category,
      description,
      emergency_flag: emergencyFlag,
      active_water_leak: activeWaterLeak,
      gas_smell: gasSmell,
      electrical_sparking: electricalSparking,
      permission_to_enter: permissionToEnter,
      pets_present: petsPresent,
      availability_windows: availabilityWindows,
      status: ticketStatus,
      tenant_token: randomUUID(),
      contractor_token: randomUUID(),
      ai_title: ai.title,
      ai_urgency: ai.urgency,
      ai_trade: ai.recommended_trade,
      ai_summary_for_landlord: ai.summary_for_landlord,
      ai_summary_for_contractor: ai.summary_for_contractor,
      ai_missing_information: ai.missing_information,
      ai_recommended_contractor_id: ai.recommended_contractor_id,
      ai_dispatch_confidence: ai.dispatch_confidence,
      ai_recommended_next_step: ai.recommended_next_step
    })
    .select("id,tenant_token")
    .single();

  if (error) throw new Error(error.message);

  await addEvent({ ticketId: ticket.id, type: "ticket_submitted", message: "Tenant submitted maintenance request", actorType: "tenant" });
  await addEvent({ ticketId: ticket.id, type: "ai_triage_complete", message: `AI categorized as ${ai.recommended_trade} with ${ai.urgency} urgency`, actorType: "ai" });
  await addEvent({ ticketId: ticket.id, type: "needs_review", message: ai.recommended_next_step, actorType: "system" });

  const files = formData.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
  for (const file of files) {
    const path = `${ticket.id}/${randomUUID()}-${file.name}`;
    const upload = await supabase.storage.from(storageBucket).upload(path, file, {
      contentType: file.type || "application/octet-stream"
    });
    if (!upload.error) {
      await supabase.from("ticket_files").insert({
        ticket_id: ticket.id,
        file_name: file.name,
        file_path: path,
        content_type: file.type || null
      });
    }
  }

  await sendSms({
    to: tenantPhone,
    body: `Thanks, your maintenance request has been received. Track it here: ${appUrl()}/status/${ticket.tenant_token}`
  });

  redirect(`/request/success?token=${ticket.tenant_token}`);
}

export async function dispatchTicket(formData: FormData) {
  const landlord = await currentLandlord();
  const supabase = createSupabaseAdminClient();
  const ticketId = String(formData.get("ticket_id"));
  const contractorId = String(formData.get("contractor_id"));

  const { data: ticket, error: ticketError } = await supabase
    .from("maintenance_tickets")
    .select("*, properties(address)")
    .eq("id", ticketId)
    .eq("landlord_id", landlord.id)
    .single();
  if (ticketError) throw new Error(ticketError.message);

  const { data: contractor, error: contractorError } = await supabase
    .from("contractors")
    .select("*")
    .eq("id", contractorId)
    .eq("landlord_id", landlord.id)
    .single();
  if (contractorError) throw new Error(contractorError.message);

  await supabase
    .from("maintenance_tickets")
    .update({ assigned_contractor_id: contractor.id, status: status.sent })
    .eq("id", ticketId);

  const jobLink = `${appUrl()}/contractor/job/${ticket.contractor_token}`;
  const title = ticket.ai_title || `${ticket.category} request`;
  await sendSms({
    to: contractor.phone,
    body: `New Relay job: ${title} at ${ticket.properties?.address}, Unit ${ticket.unit_number}. View and respond: ${jobLink}`
  });
  if (contractor.email) {
    await sendContractorEmail({
      to: contractor.email,
      contractorName: contractor.name,
      ticketTitle: title,
      jobUrl: jobLink,
      message: ticket.ai_summary_for_contractor || ticket.description
    });
  }

  await addEvent({
    ticketId,
    type: "dispatch_approved",
    message: `Landlord approved dispatch to ${contractor.name}`,
    actorType: "landlord",
    actorId: landlord.id
  });
  await addEvent({ ticketId, type: "sent_to_contractor", message: `Job sent to ${contractor.name}`, actorType: "system" });

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  revalidatePath("/dashboard");
}

export async function closeTicket(formData: FormData) {
  const landlord = await currentLandlord();
  const ticketId = String(formData.get("ticket_id"));
  const supabase = createSupabaseAdminClient();
  await supabase.from("maintenance_tickets").update({ status: status.closed }).eq("id", ticketId).eq("landlord_id", landlord.id);
  await addEvent({ ticketId, type: "closed", message: "Landlord closed ticket", actorType: "landlord", actorId: landlord.id });
  revalidatePath(`/dashboard/tickets/${ticketId}`);
}

export async function markManualEmergency(formData: FormData) {
  const landlord = await currentLandlord();
  const ticketId = String(formData.get("ticket_id"));
  const supabase = createSupabaseAdminClient();
  await supabase.from("maintenance_tickets").update({ status: status.emergency }).eq("id", ticketId).eq("landlord_id", landlord.id);
  await addEvent({ ticketId, type: "emergency_escalated", message: "Landlord marked for emergency/manual handling", actorType: "landlord", actorId: landlord.id });
  revalidatePath(`/dashboard/tickets/${ticketId}`);
}

export async function contractorAction(formData: FormData) {
  const supabase = createSupabaseAdminClient();
  const token = String(formData.get("token"));
  const action = String(formData.get("action"));
  const note = String(formData.get("note") || "");

  const { data: ticket, error } = await supabase
    .from("maintenance_tickets")
    .select("*, contractors(name), properties(address)")
    .eq("contractor_token", token)
    .single();
  if (error) throw new Error(error.message);

  if (action === "accept") {
    await supabase.from("maintenance_tickets").update({ status: status.accepted }).eq("id", ticket.id);
    await addEvent({ ticketId: ticket.id, type: "contractor_accepted", message: "Contractor accepted job", actorType: "contractor", actorId: ticket.assigned_contractor_id });
    await sendSms({ to: ticket.tenant_phone, body: `Update: ${ticket.ai_title || ticket.category} has been accepted by the contractor.` });
  }

  if (action === "decline") {
    await supabase.from("maintenance_tickets").update({ status: status.declined }).eq("id", ticket.id);
    await addEvent({ ticketId: ticket.id, type: "contractor_declined", message: `Contractor declined${note ? `: ${note}` : ""}`, actorType: "contractor", actorId: ticket.assigned_contractor_id });
  }

  if (action === "request_info") {
    await supabase.from("maintenance_tickets").update({ status: status.needsAttention }).eq("id", ticket.id);
    await addEvent({ ticketId: ticket.id, type: "more_info_requested", message: note || "Contractor requested more information", actorType: "contractor", actorId: ticket.assigned_contractor_id });
  }

  if (action === "propose_time") {
    const startAt = String(formData.get("start_at") || "");
    const endAt = String(formData.get("end_at") || "");
    await supabase.from("appointment_proposals").insert({
      ticket_id: ticket.id,
      contractor_id: ticket.assigned_contractor_id,
      start_at: startAt,
      end_at: endAt
    });
    await supabase.from("maintenance_tickets").update({ status: status.scheduling }).eq("id", ticket.id);
    await addEvent({ ticketId: ticket.id, type: "time_proposed", message: `Contractor proposed ${new Date(startAt).toLocaleString()} - ${new Date(endAt).toLocaleString()}`, actorType: "contractor", actorId: ticket.assigned_contractor_id });
    await sendSms({ to: ticket.tenant_phone, body: `${ticket.contractors?.name || "Your contractor"} proposed a visit time. Confirm here: ${appUrl()}/status/${ticket.tenant_token}` });
  }

  if (action === "complete") {
    await supabase.from("maintenance_tickets").update({ status: status.completed, completion_notes: note || null }).eq("id", ticket.id);
    await addEvent({ ticketId: ticket.id, type: "completed", message: note ? `Contractor marked complete: ${note}` : "Contractor marked job complete", actorType: "contractor", actorId: ticket.assigned_contractor_id });
    await sendSms({ to: ticket.tenant_phone, body: "Your maintenance request has been marked complete. Open your status page if the issue is not resolved." });
  }

  if (note && action !== "complete") {
    await supabase.from("ticket_messages").insert({ ticket_id: ticket.id, sender_type: "contractor", body: note });
  }

  revalidatePath(`/contractor/job/${token}`);
}

export async function tenantAppointmentAction(formData: FormData) {
  const supabase = createSupabaseAdminClient();
  const token = String(formData.get("token"));
  const proposalId = String(formData.get("proposal_id"));
  const action = String(formData.get("action"));
  const newAvailability = String(formData.get("new_availability") || "");

  const { data: ticket, error } = await supabase.from("maintenance_tickets").select("*").eq("tenant_token", token).single();
  if (error) throw new Error(error.message);

  if (action === "confirm") {
    const { data: proposal } = await supabase.from("appointment_proposals").select("*").eq("id", proposalId).eq("ticket_id", ticket.id).single();
    if (proposal) {
      await supabase.from("appointment_proposals").update({ status: "Confirmed" }).eq("id", proposal.id);
      await supabase
        .from("maintenance_tickets")
        .update({ status: status.scheduled, scheduled_start: proposal.start_at, scheduled_end: proposal.end_at })
        .eq("id", ticket.id);
      await addEvent({ ticketId: ticket.id, type: "appointment_confirmed", message: `Tenant confirmed ${new Date(proposal.start_at).toLocaleString()} - ${new Date(proposal.end_at).toLocaleString()}`, actorType: "tenant" });
    }
  }

  if (action === "reject") {
    await supabase.from("appointment_proposals").update({ status: "Rejected" }).eq("id", proposalId).eq("ticket_id", ticket.id);
    await supabase.from("maintenance_tickets").update({ status: status.needsAttention, availability_windows: newAvailability || ticket.availability_windows }).eq("id", ticket.id);
    await addEvent({ ticketId: ticket.id, type: "appointment_rejected", message: newAvailability ? `Tenant rejected time and suggested: ${newAvailability}` : "Tenant rejected proposed time", actorType: "tenant" });
  }

  revalidatePath(`/status/${token}`);
}

"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { analyzeTicket } from "@/lib/ai";
import { sendContractorEmail } from "@/lib/email";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

const storageBucket = "ticket-files";

export async function createTicket(formData: FormData) {
  const supabase = createSupabaseAdminClient();
  const tenantName = String(formData.get("tenant_name") || "");
  const tenantPhone = String(formData.get("tenant_phone") || "");
  const tenantEmail = String(formData.get("tenant_email") || "");
  const propertyAddress = String(formData.get("property_address") || "");
  const unitNumber = String(formData.get("unit_number") || "");
  const requestType = String(formData.get("request_type") || "");
  const description = String(formData.get("description") || "");
  const availabilityWindows = String(formData.get("availability_windows") || "");

  if (!tenantName || !tenantPhone || !tenantEmail || !propertyAddress || !requestType || !description) {
    throw new Error("Missing required maintenance request fields");
  }

  const ai = await analyzeTicket({
    requestType,
    description,
    propertyAddress,
    unitNumber,
    availabilityWindows
  });

  const token = randomUUID();
  const { data: ticket, error } = await supabase
    .from("maintenance_tickets")
    .insert({
      tenant_name: tenantName,
      tenant_phone: tenantPhone,
      tenant_email: tenantEmail,
      property_address: propertyAddress,
      unit_number: unitNumber || null,
      request_type: requestType,
      description,
      availability_windows: availabilityWindows,
      public_token: token,
      status: "new",
      ai_title: ai.title,
      ai_category: ai.category,
      ai_urgency: ai.urgency,
      ai_summary: ai.summary,
      ai_missing_info: ai.missing_info,
      ai_tenant_follow_up: ai.tenant_follow_up,
      ai_contractor_message: ai.contractor_message
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("ticket_events").insert({
    ticket_id: ticket.id,
    actor_type: "tenant",
    body: "Maintenance request submitted"
  });

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

  redirect(`/request/success?id=${ticket.id}`);
}

export async function signIn(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function currentLandlordId() {
  const server = await createSupabaseServerClient();
  const {
    data: { user }
  } = await server.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createSupabaseAdminClient();
  const { data: landlord, error } = await admin
    .from("landlords")
    .upsert({ user_id: user.id, email: user.email ?? null }, { onConflict: "user_id" })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return landlord.id;
}

export async function addContractor(formData: FormData) {
  const landlordId = await currentLandlordId();
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("contractors").insert({
    landlord_id: landlordId,
    name: String(formData.get("name") || ""),
    trade: String(formData.get("trade") || ""),
    phone: String(formData.get("phone") || "") || null,
    email: String(formData.get("email") || "")
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/contractors");
}

export async function sendToContractor(formData: FormData) {
  const landlordId = await currentLandlordId();
  const supabase = createSupabaseAdminClient();
  const ticketId = String(formData.get("ticket_id"));
  const contractorId = String(formData.get("contractor_id"));

  const { data: contractor, error: contractorError } = await supabase
    .from("contractors")
    .select("*")
    .eq("id", contractorId)
    .eq("landlord_id", landlordId)
    .single();
  if (contractorError) {
    throw new Error(contractorError.message);
  }

  const { data: ticket, error: ticketError } = await supabase
    .from("maintenance_tickets")
    .select("*")
    .eq("id", ticketId)
    .single();
  if (ticketError) {
    throw new Error(ticketError.message);
  }

  const jobUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/jobs/${ticket.public_token}`;
  const email = await sendContractorEmail({
    to: contractor.email,
    contractorName: contractor.name,
    ticketTitle: ticket.ai_title || ticket.request_type,
    jobUrl,
    message: ticket.ai_contractor_message || ticket.ai_summary || ticket.description
  });

  await supabase
    .from("maintenance_tickets")
    .update({ contractor_id: contractor.id, landlord_id: landlordId, status: "sent_to_contractor" })
    .eq("id", ticketId);

  await supabase.from("ticket_events").insert({
    ticket_id: ticketId,
    actor_type: "landlord",
    body: email.sent
      ? `Sent to ${contractor.name} (${contractor.trade})`
      : `Assigned to ${contractor.name}; email not sent: ${email.reason}`
  });

  revalidatePath(`/dashboard/tickets/${ticketId}`);
}

export async function contractorAction(formData: FormData) {
  const supabase = createSupabaseAdminClient();
  const token = String(formData.get("token"));
  const action = String(formData.get("action"));
  const note = String(formData.get("note") || "");

  const statusByAction: Record<string, string> = {
    accept: "accepted",
    decline: "declined",
    more_info: "needs_more_info",
    complete: "complete"
  };

  const { data: ticket, error } = await supabase
    .from("maintenance_tickets")
    .select("id")
    .eq("public_token", token)
    .single();
  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from("maintenance_tickets")
    .update({ status: statusByAction[action] || "sent_to_contractor" })
    .eq("id", ticket.id);

  await supabase.from("ticket_events").insert({
    ticket_id: ticket.id,
    actor_type: "contractor",
    body: `${action.replace("_", " ")}${note ? `: ${note}` : ""}`
  });

  if (note) {
    await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_type: "contractor",
      body: note
    });
  }

  revalidatePath(`/jobs/${token}`);
}

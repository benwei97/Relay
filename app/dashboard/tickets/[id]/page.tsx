import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Send, XCircle } from "lucide-react";
import { closeTicket, dispatchTicket, markManualEmergency } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const server = await createSupabaseServerClient();
  const {
    data: { user }
  } = await server.auth.getUser();
  if (!user) redirect("/login");

  const supabase = createSupabaseAdminClient();
  const { data: landlord } = await supabase
    .from("landlords")
    .upsert({ user_id: user.id, email: user.email ?? null }, { onConflict: "user_id" })
    .select("id")
    .single();

  const [{ data: ticket }, { data: files }, { data: events }, { data: contractors }, { data: proposals }] = await Promise.all([
    supabase
      .from("maintenance_tickets")
      .select("*, properties(name,address,access_notes,parking_notes), assigned_contractor:contractors!maintenance_tickets_assigned_contractor_id_fkey(name)")
      .eq("id", id)
      .eq("landlord_id", landlord?.id ?? "")
      .single(),
    supabase.from("ticket_files").select("*").eq("ticket_id", id).order("created_at", { ascending: true }),
    supabase.from("ticket_events").select("*").eq("ticket_id", id).order("created_at", { ascending: true }),
    supabase.from("contractors").select("*").eq("landlord_id", landlord?.id ?? "").eq("active", true).order("priority", { ascending: true }),
    supabase.from("appointment_proposals").select("*").eq("ticket_id", id).order("created_at", { ascending: false })
  ]);

  if (!ticket) redirect("/dashboard");

  const signedFiles = await Promise.all(
    (files ?? []).map(async (file) => {
      const { data } = await supabase.storage.from("ticket-files").createSignedUrl(file.file_path, 60 * 60);
      return { ...file, signedUrl: data?.signedUrl };
    })
  );

  const suggestedContractor = contractors?.find((contractor) => contractor.id === ticket.ai_recommended_contractor_id);

  return (
    <section className="space-y-6">
      <Link href="/dashboard" className="text-sm">
        Back to dashboard
      </Link>
      <div className="rounded-lg border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-primary">{ticket.status}</div>
            <h1 className="mt-1 text-3xl font-semibold">{ticket.ai_title || `${ticket.category} request`}</h1>
            <p className="mt-1 text-muted-foreground">
              {ticket.properties?.name} / Unit {ticket.unit_number} / {ticket.properties?.address}
            </p>
          </div>
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            {ticket.ai_urgency || "Routine"} / {ticket.ai_trade || ticket.category}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI dispatch summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Info label="Landlord summary" value={ticket.ai_summary_for_landlord || ticket.description} />
              <Info label="Contractor packet" value={ticket.ai_summary_for_contractor || ticket.description} />
              <Info label="Missing information" value={ticket.ai_missing_information?.length ? ticket.ai_missing_information.join(", ") : "None listed"} />
              <Info label="Recommended next step" value={ticket.ai_recommended_next_step || "Review and dispatch when ready."} />
              <Info label="Dispatch confidence" value={ticket.ai_dispatch_confidence ? `${Math.round(Number(ticket.ai_dispatch_confidence) * 100)}%` : "Not scored"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tenant request</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Info label="Tenant" value={ticket.tenant_name} />
              <Info label="Phone" value={ticket.tenant_phone} />
              <Info label="Email" value={ticket.tenant_email || "Not provided"} />
              <Info label="Category" value={ticket.category} />
              <Info label="Permission to enter" value={ticket.permission_to_enter ? "Yes" : "No"} />
              <Info label="Pets present" value={ticket.pets_present ? "Yes" : "No"} />
              <div className="sm:col-span-2">
                <Info label="Description" value={ticket.description} />
              </div>
              <div className="sm:col-span-2">
                <Info label="Availability" value={ticket.availability_windows || "Not provided"} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {signedFiles.map((file) => (
                <a key={file.id} href={file.signedUrl} target="_blank" className="rounded-md border p-3 text-sm font-medium no-underline">
                  {file.file_name}
                </a>
              ))}
              {!signedFiles.length ? <p className="text-muted-foreground">No photos uploaded.</p> : null}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dispatch controls</CardTitle>
              <p className="text-sm text-muted-foreground">Suggested: {suggestedContractor?.name || "No matching contractor"}</p>
            </CardHeader>
            <CardContent>
              <form action={dispatchTicket} className="space-y-3">
                <input type="hidden" name="ticket_id" value={ticket.id} />
                <select
                  name="contractor_id"
                  required
                  className="h-10 w-full rounded-md border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  defaultValue={ticket.ai_recommended_contractor_id || ""}
                >
                  <option value="" disabled>
                    Select contractor
                  </option>
                  {(contractors ?? []).map((contractor) => (
                    <option key={contractor.id} value={contractor.id}>
                      {contractor.name} - {contractor.trades?.join(", ")}
                    </option>
                  ))}
                </select>
                <Button className="w-full" disabled={!contractors?.length}>
                  <Send className="h-4 w-4" />
                  Approve Dispatch
                </Button>
              </form>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <form action={markManualEmergency}>
                  <input type="hidden" name="ticket_id" value={ticket.id} />
                  <Button variant="outline" className="w-full">
                    <AlertTriangle className="h-4 w-4" />
                    Emergency
                  </Button>
                </form>
                <form action={closeTicket}>
                  <input type="hidden" name="ticket_id" value={ticket.id} />
                  <Button variant="secondary" className="w-full">
                    <XCircle className="h-4 w-4" />
                    Close
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scheduling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {ticket.scheduled_start ? (
                <Info label="Confirmed appointment" value={`${new Date(ticket.scheduled_start).toLocaleString()} - ${new Date(ticket.scheduled_end).toLocaleString()}`} />
              ) : (
                <p className="text-muted-foreground">No confirmed appointment yet.</p>
              )}
              {(proposals ?? []).map((proposal) => (
                <div key={proposal.id} className="rounded-md border p-3">
                  <div>{new Date(proposal.start_at).toLocaleString()} - {new Date(proposal.end_at).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{proposal.status}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                {(events ?? []).map((event) => (
                  <li key={event.id} className="border-l-2 pl-3">
                    <div className="font-medium capitalize">{event.actor_type}</div>
                    <div>{event.message}</div>
                    <div className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm">{value}</div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { tenantAppointmentAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TenantStatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: ticket } = await supabase
    .from("maintenance_tickets")
    .select("*, properties(name,address), contractors(name)")
    .eq("tenant_token", token)
    .single();

  if (!ticket) notFound();

  const [{ data: events }, { data: proposals }] = await Promise.all([
    supabase.from("ticket_events").select("*").eq("ticket_id", ticket.id).order("created_at", { ascending: true }),
    supabase.from("appointment_proposals").select("*").eq("ticket_id", ticket.id).eq("status", "Proposed").order("created_at", { ascending: false })
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 rounded-lg border bg-white p-5">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">{ticket.properties?.name}</p>
        <h1 className="mt-2 text-3xl font-semibold">{ticket.ai_title || `${ticket.category} request`}</h1>
        <p className="mt-2 text-muted-foreground">Current status: {ticket.status}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Appointment proposals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(proposals ?? []).map((proposal) => (
              <div key={proposal.id} className="rounded-md border p-3">
                <div className="font-medium">
                  {new Date(proposal.start_at).toLocaleString()} - {new Date(proposal.end_at).toLocaleString()}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={tenantAppointmentAction}>
                    <input type="hidden" name="token" value={token} />
                    <input type="hidden" name="proposal_id" value={proposal.id} />
                    <Button name="action" value="confirm">
                      Confirm
                    </Button>
                  </form>
                </div>
                <form action={tenantAppointmentAction} className="mt-3 space-y-2">
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="proposal_id" value={proposal.id} />
                  <Textarea name="new_availability" placeholder="If this does not work, suggest new availability" />
                  <Button name="action" value="reject" variant="outline">
                    Reject / suggest another time
                  </Button>
                </form>
              </div>
            ))}
            {!proposals?.length ? <p className="text-muted-foreground">No appointment time is waiting for confirmation.</p> : null}
            {ticket.scheduled_start ? (
              <p className="rounded-md bg-muted p-3 text-sm">
                Confirmed appointment: {new Date(ticket.scheduled_start).toLocaleString()} - {new Date(ticket.scheduled_end).toLocaleString()}
              </p>
            ) : null}
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
                  <div>{event.message}</div>
                  <div className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

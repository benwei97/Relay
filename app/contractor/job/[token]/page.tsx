import { notFound } from "next/navigation";
import { contractorAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ContractorJobPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: ticket } = await supabase
    .from("maintenance_tickets")
    .select("*, properties(name,address,access_notes,parking_notes), assigned_contractor:contractors!maintenance_tickets_assigned_contractor_id_fkey(name)")
    .eq("contractor_token", token)
    .single();

  if (!ticket) notFound();

  const [{ data: files }, { data: events }] = await Promise.all([
    supabase.from("ticket_files").select("*").eq("ticket_id", ticket.id).order("created_at", { ascending: true }),
    supabase.from("ticket_events").select("*").eq("ticket_id", ticket.id).order("created_at", { ascending: true })
  ]);

  const signedFiles = await Promise.all(
    (files ?? []).map(async (file) => {
      const { data } = await supabase.storage.from("ticket-files").createSignedUrl(file.file_path, 60 * 60);
      return { ...file, signedUrl: data?.signedUrl };
    })
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">Relay job</p>
        <h1 className="mt-2 text-3xl font-semibold">{ticket.ai_title || `${ticket.category} request`}</h1>
        <p className="mt-1 text-muted-foreground">
          {ticket.properties?.address}, Unit {ticket.unit_number}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job packet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Info label="Summary" value={ticket.ai_summary_for_contractor || ticket.description} />
              <Info label="Original description" value={ticket.description} />
              <Info label="Tenant availability" value={ticket.availability_windows || "Not provided"} />
              <Info label="Permission to enter" value={ticket.permission_to_enter ? "Yes" : "No"} />
              <Info label="Pets present" value={ticket.pets_present ? "Yes" : "No"} />
              <Info label="Access notes" value={ticket.properties?.access_notes || "None provided"} />
              <Info label="Parking notes" value={ticket.properties?.parking_notes || "None provided"} />
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
        </section>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Respond</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={contractorAction} className="grid grid-cols-2 gap-2">
                <input type="hidden" name="token" value={token} />
                <Button name="action" value="accept">
                  Accept
                </Button>
                <Button name="action" value="decline" variant="outline">
                  Decline
                </Button>
              </form>
              <form action={contractorAction} className="space-y-2">
                <input type="hidden" name="token" value={token} />
                <Textarea name="note" placeholder="What information do you need?" />
                <Button name="action" value="request_info" variant="secondary" className="w-full">
                  Request More Info
                </Button>
              </form>
              <form action={contractorAction} className="space-y-2">
                <input type="hidden" name="token" value={token} />
                <Input name="start_at" type="datetime-local" required />
                <Input name="end_at" type="datetime-local" required />
                <Button name="action" value="propose_time" variant="secondary" className="w-full">
                  Propose Time
                </Button>
              </form>
              <form action={contractorAction} className="space-y-2">
                <input type="hidden" name="token" value={token} />
                <Textarea name="note" placeholder="Completion notes optional" />
                <Button name="action" value="complete" className="w-full">
                  Mark Complete
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
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
        </aside>
      </div>
    </main>
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

import { contractorAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PublicJobPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createSupabaseAdminClient();
  const [{ data: ticket }, { data: files }, { data: events }] = await Promise.all([
    supabase.from("maintenance_tickets").select("*").eq("public_token", token).single(),
    supabase
      .from("maintenance_tickets")
      .select("id")
      .eq("public_token", token)
      .single()
      .then(async ({ data }) =>
        data
          ? supabase.from("ticket_files").select("*").eq("ticket_id", data.id).order("created_at", { ascending: true })
          : { data: [] }
      ),
    supabase
      .from("maintenance_tickets")
      .select("id")
      .eq("public_token", token)
      .single()
      .then(async ({ data }) =>
        data
          ? supabase.from("ticket_events").select("*").eq("ticket_id", data.id).order("created_at", { ascending: true })
          : { data: [] }
      )
  ]);

  if (!ticket) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-6">
        <Card>
          <CardHeader>
            <CardTitle>Job not found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">This public job link is invalid or no longer available.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const signedFiles = await Promise.all(
    (files ?? []).map(async (file) => {
      const { data } = await supabase.storage.from("ticket-files").createSignedUrl(file.file_path, 60 * 60);
      return { ...file, signedUrl: data?.signedUrl };
    })
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">Contractor job</p>
        <h1 className="mt-2 text-3xl font-semibold">{ticket.ai_title || ticket.request_type}</h1>
        <p className="mt-1 text-muted-foreground">
          {ticket.property_address}
          {ticket.unit_number ? `, Unit ${ticket.unit_number}` : ""}
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Issue summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Info label="Category" value={ticket.ai_category || ticket.request_type} />
              <Info label="Urgency" value={ticket.ai_urgency || "medium"} />
              <Info label="Summary" value={ticket.ai_summary || ticket.description} />
              <Info label="Tenant availability" value={ticket.availability_windows || "Not provided"} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Photos and files</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {signedFiles.map((file) => (
                <a key={file.id} href={file.signedUrl} target="_blank" className="rounded-md border p-3 text-sm font-medium no-underline">
                  {file.file_name}
                </a>
              ))}
              {!signedFiles.length ? <p className="text-muted-foreground">No files uploaded.</p> : null}
            </CardContent>
          </Card>
        </section>
        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Update job</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={contractorAction} className="space-y-3">
                <input type="hidden" name="token" value={token} />
                <Textarea name="note" placeholder="Optional note" />
                <div className="grid grid-cols-2 gap-2">
                  <Button name="action" value="accept">
                    Accept
                  </Button>
                  <Button name="action" value="decline" variant="outline">
                    Decline
                  </Button>
                  <Button name="action" value="more_info" variant="secondary">
                    Request More Info
                  </Button>
                  <Button name="action" value="complete" variant="secondary">
                    Mark Complete
                  </Button>
                </div>
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
                    <div className="font-medium capitalize">{event.actor_type}</div>
                    <div>{event.body}</div>
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

import Link from "next/link";
import { redirect } from "next/navigation";
import { Send } from "lucide-react";
import { sendToContractor } from "@/app/actions";
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

  const [{ data: ticket }, { data: files }, { data: events }, { data: contractors }] = await Promise.all([
    supabase.from("maintenance_tickets").select("*").eq("id", id).single(),
    supabase.from("ticket_files").select("*").eq("ticket_id", id).order("created_at", { ascending: true }),
    supabase.from("ticket_events").select("*").eq("ticket_id", id).order("created_at", { ascending: true }),
    supabase
      .from("contractors")
      .select("*")
      .eq("landlord_id", landlord?.id ?? "")
      .order("name", { ascending: true })
  ]);

  if (!ticket) redirect("/dashboard");

  const signedFiles = await Promise.all(
    (files ?? []).map(async (file) => {
      const { data } = await supabase.storage.from("ticket-files").createSignedUrl(file.file_path, 60 * 60);
      return { ...file, signedUrl: data?.signedUrl };
    })
  );

  return (
    <section className="space-y-6">
      <Link href="/dashboard" className="text-sm">
        Back to tickets
      </Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{ticket.ai_title || ticket.request_type}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {ticket.property_address}
                {ticket.unit_number ? `, Unit ${ticket.unit_number}` : ""}
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Info label="Category" value={ticket.ai_category || ticket.request_type} />
                <Info label="Urgency" value={ticket.ai_urgency || "medium"} />
                <Info label="Status" value={ticket.status.replaceAll("_", " ")} />
              </div>
              <Info label="AI summary" value={ticket.ai_summary || ticket.description} />
              <Info label="Original description" value={ticket.description} />
              <Info label="Missing info" value={ticket.ai_missing_info?.length ? ticket.ai_missing_info.join(", ") : "None listed"} />
              <Info label="Tenant follow-up" value={ticket.ai_tenant_follow_up || "None"} />
              <Info label="Contractor message" value={ticket.ai_contractor_message || "None"} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Uploaded files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {signedFiles.map((file) => (
                  <a
                    key={file.id}
                    href={file.signedUrl}
                    className="rounded-md border bg-white p-3 text-sm font-medium no-underline hover:bg-muted"
                    target="_blank"
                  >
                    {file.file_name}
                  </a>
                ))}
                {!signedFiles.length ? <p className="text-muted-foreground">No files uploaded.</p> : null}
              </div>
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tenant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Info label="Name" value={ticket.tenant_name} />
              <Info label="Phone" value={ticket.tenant_phone} />
              <Info label="Email" value={ticket.tenant_email} />
              <Info label="Availability" value={ticket.availability_windows || "Not provided"} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Send to contractor</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={sendToContractor} className="space-y-3">
                <input type="hidden" name="ticket_id" value={ticket.id} />
                <select
                  name="contractor_id"
                  required
                  className="h-10 w-full rounded-md border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select contractor
                  </option>
                  {(contractors ?? []).map((contractor) => (
                    <option key={contractor.id} value={contractor.id}>
                      {contractor.name} - {contractor.trade}
                    </option>
                  ))}
                </select>
                <Button className="w-full" disabled={!contractors?.length}>
                  <Send className="h-4 w-4" />
                  Send to Contractor
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Activity timeline</CardTitle>
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

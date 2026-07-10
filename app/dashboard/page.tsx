import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const groups = ["Needs Landlord Review", "Sent to Contractor", "Scheduling", "Scheduled", "Completed"];

export default async function DashboardPage() {
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

  const { data: tickets } = await supabase
    .from("maintenance_tickets")
    .select("*, properties(name,address), contractors(name)")
    .eq("landlord_id", landlord?.id ?? "")
    .order("updated_at", { ascending: false });

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Maintenance Dispatch</h1>
          <p className="mt-1 text-muted-foreground">Approve dispatch, track scheduling, and close out repairs.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/properties">Get request link</Link>
        </Button>
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        {groups.map((group) => {
          const items = (tickets ?? []).filter((ticket) => ticket.status === group || (group === "Needs Landlord Review" && ["Submitted", "AI Triage Complete", "Emergency Escalated", "Needs Attention", "Contractor Declined"].includes(ticket.status)));
          return (
            <div key={group} className="rounded-lg border bg-white">
              <div className="border-b bg-muted px-3 py-2">
                <h2 className="text-sm font-semibold">{group}</h2>
                <p className="text-xs text-muted-foreground">{items.length} tickets</p>
              </div>
              <div className="space-y-3 p-3">
                {items.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/dashboard/tickets/${ticket.id}`}
                    className="block rounded-md border bg-white p-3 text-foreground no-underline hover:bg-muted"
                  >
                    <div className="font-medium">{ticket.ai_title || `${ticket.category} request`}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {ticket.properties?.name} / Unit {ticket.unit_number}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded bg-muted px-2 py-1">{ticket.ai_urgency || "Routine"}</span>
                      <span className="rounded bg-muted px-2 py-1">{ticket.contractors?.name || "Unassigned"}</span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">{new Date(ticket.updated_at).toLocaleString()}</div>
                  </Link>
                ))}
                {!items.length ? <p className="py-4 text-center text-sm text-muted-foreground">No tickets</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

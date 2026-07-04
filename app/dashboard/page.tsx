import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const server = await createSupabaseServerClient();
  const {
    data: { user }
  } = await server.auth.getUser();
  if (!user) redirect("/login");

  const supabase = createSupabaseAdminClient();
  const { data: tickets } = await supabase
    .from("maintenance_tickets")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <section>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Maintenance Tickets</h1>
          <p className="mt-1 text-muted-foreground">Review requests, AI triage, and contractor progress.</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Issue</th>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Property</th>
              <th className="px-4 py-3 font-medium">Urgency</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(tickets ?? []).map((ticket) => (
              <tr key={ticket.id} className="border-t">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/dashboard/tickets/${ticket.id}`}>{ticket.ai_title || ticket.request_type}</Link>
                  <div className="text-xs text-muted-foreground">{new Date(ticket.created_at).toLocaleString()}</div>
                </td>
                <td className="px-4 py-3">{ticket.tenant_name}</td>
                <td className="px-4 py-3">{ticket.property_address}</td>
                <td className="px-4 py-3 capitalize">{ticket.ai_urgency || "medium"}</td>
                <td className="px-4 py-3 capitalize">{ticket.status.replaceAll("_", " ")}</td>
              </tr>
            ))}
            {!tickets?.length ? (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>
                  No maintenance tickets yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

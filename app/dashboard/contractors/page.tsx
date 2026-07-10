import { redirect } from "next/navigation";
import { addContractor } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const trades = ["Plumbing", "Electrical", "HVAC", "Appliance", "Handyman", "Pest", "Roofing", "General"];

export default async function ContractorsPage() {
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
  const { data: contractors } = await supabase
    .from("contractors")
    .select("*")
    .eq("landlord_id", landlord?.id ?? "")
    .order("priority", { ascending: true });

  return (
    <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Add contractor</CardTitle>
          <p className="text-sm text-muted-foreground">Relay recommends active contractors by trade and priority.</p>
        </CardHeader>
        <CardContent>
          <form action={addContractor} className="space-y-4">
            <Input name="name" placeholder="Contact name" required />
            <Input name="company_name" placeholder="Company name" />
            <Input name="phone" placeholder="Phone for SMS" required />
            <Input name="email" type="email" placeholder="Email optional" />
            <Input name="priority" type="number" min="1" defaultValue="1" placeholder="Priority" />
            <div className="grid grid-cols-2 gap-2 text-sm">
              {trades.map((trade) => (
                <label key={trade} className="flex items-center gap-2 rounded-md border bg-white px-3 py-2">
                  <input type="checkbox" name="trades" value={trade} />
                  {trade}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked />
              Active
            </label>
            <Button className="w-full">Add contractor</Button>
          </form>
        </CardContent>
      </Card>
      <div className="rounded-lg border bg-white">
        <div className="border-b p-4">
          <h1 className="text-xl font-semibold">Contractors</h1>
        </div>
        <div className="divide-y">
          {(contractors ?? []).map((contractor) => (
            <div key={contractor.id} className="grid gap-2 p-4 sm:grid-cols-[1fr_1fr_120px_90px]">
              <div>
                <div className="font-medium">{contractor.name}</div>
                <div className="text-sm text-muted-foreground">{contractor.company_name || "Independent"}</div>
              </div>
              <div className="text-sm">{contractor.trades?.join(", ") || "No trades"}</div>
              <div className="text-sm text-muted-foreground">Priority {contractor.priority}</div>
              <div className="text-sm">{contractor.active ? "Active" : "Inactive"}</div>
            </div>
          ))}
          {!contractors?.length ? <p className="p-6 text-muted-foreground">No contractors added yet.</p> : null}
        </div>
      </div>
    </section>
  );
}

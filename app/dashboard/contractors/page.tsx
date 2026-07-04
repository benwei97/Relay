import { redirect } from "next/navigation";
import { addContractor } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
    .order("created_at", { ascending: false });

  return (
    <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Add contractor</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addContractor} className="space-y-4">
            <Input name="name" placeholder="Name" required />
            <Input name="trade" placeholder="Trade, e.g. plumber" required />
            <Input name="phone" placeholder="Phone" />
            <Input name="email" type="email" placeholder="Email" required />
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
            <div key={contractor.id} className="grid gap-1 p-4 sm:grid-cols-4">
              <div className="font-medium">{contractor.name}</div>
              <div>{contractor.trade}</div>
              <div className="text-muted-foreground">{contractor.phone}</div>
              <div className="text-muted-foreground">{contractor.email}</div>
            </div>
          ))}
          {!contractors?.length ? <p className="p-6 text-muted-foreground">No contractors added yet.</p> : null}
        </div>
      </div>
    </section>
  );
}

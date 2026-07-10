import Link from "next/link";
import { redirect } from "next/navigation";
import { Copy } from "lucide-react";
import { addProperty } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
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
  const { data: properties } = await supabase
    .from("properties")
    .select("*, units(unit_number)")
    .eq("landlord_id", landlord?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Create property</CardTitle>
          <p className="text-sm text-muted-foreground">Add the property once, then share its tenant request link.</p>
        </CardHeader>
        <CardContent>
          <form action={addProperty} className="space-y-4">
            <Input name="name" placeholder="Property name" required />
            <Input name="address" placeholder="Address" required />
            <div className="space-y-2 rounded-md border bg-muted p-3">
              <div>
                <h3 className="text-sm font-medium">Optional contractor instructions</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  These appear in contractor job packets so you do not have to repeat access or parking details.
                </p>
              </div>
              <Textarea name="access_notes" placeholder="Access instructions for contractors, e.g. gate code, lockbox, side entrance" />
              <Textarea name="parking_notes" placeholder="Parking instructions for contractors, e.g. driveway, street parking, loading zone" />
            </div>
            <Button className="w-full">Create request link</Button>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-4">
        {(properties ?? []).map((property) => {
          const requestUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/request/${property.request_link_slug}`;
          return (
            <Card key={property.id}>
              <CardHeader>
                <CardTitle>{property.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{property.address}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tenant request link</div>
                  <div className="mt-1 break-all rounded-md border bg-muted p-3 text-sm">{requestUrl}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline">
                    <Link href={`/request/${property.request_link_slug}`} target="_blank">
                      <Copy className="h-4 w-4" />
                      Open form
                    </Link>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Suggested tenant message: Please submit maintenance requests here so repairs are routed and tracked: {requestUrl}
                </p>
                <div className="text-sm text-muted-foreground">
                  Units are captured automatically when tenants submit requests.
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!properties?.length ? <p className="rounded-lg border bg-white p-8 text-center text-muted-foreground">Create your first property to get a tenant request link.</p> : null}
      </div>
    </section>
  );
}

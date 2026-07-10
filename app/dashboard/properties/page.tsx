import Link from "next/link";
import { redirect } from "next/navigation";
import { Copy, MoreVertical, Save, Trash2 } from "lucide-react";
import { addProperty, deleteProperty, updateProperty } from "@/app/actions";
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
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle>{property.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{property.address}</p>
                </div>
                <details className="relative">
                  <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border bg-white text-muted-foreground hover:bg-muted [&::-webkit-details-marker]:hidden">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Property actions</span>
                  </summary>
                  <div className="absolute right-0 z-10 mt-2 w-80 rounded-md border bg-white p-3 shadow-lg">
                    <form action={updateProperty} className="space-y-3">
                      <input type="hidden" name="property_id" value={property.id} />
                      <Input name="name" defaultValue={property.name} placeholder="Property name" required />
                      <Input name="address" defaultValue={property.address} placeholder="Address" required />
                      <Textarea
                        name="access_notes"
                        defaultValue={property.access_notes || ""}
                        placeholder="Optional contractor access instructions"
                      />
                      <Textarea
                        name="parking_notes"
                        defaultValue={property.parking_notes || ""}
                        placeholder="Optional contractor parking instructions"
                      />
                      <Button variant="secondary" size="sm" className="w-full">
                        <Save className="h-4 w-4" />
                        Save changes
                      </Button>
                    </form>
                    <form action={deleteProperty} className="mt-3 border-t pt-3">
                      <input type="hidden" name="property_id" value={property.id} />
                      <label className="flex items-start gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" name="confirm_delete" className="mt-0.5" />
                        <span>Confirm delete. This removes related tickets and is intended for test cleanup.</span>
                      </label>
                      <Button variant="destructive" size="sm" className="mt-3 w-full">
                        <Trash2 className="h-4 w-4" />
                        Delete property
                      </Button>
                    </form>
                  </div>
                </details>
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
                <div className="text-sm text-muted-foreground">Units are captured automatically when tenants submit requests.</div>
              </CardContent>
            </Card>
          );
        })}
        {!properties?.length ? <p className="rounded-lg border bg-white p-8 text-center text-muted-foreground">Create your first property to get a tenant request link.</p> : null}
      </div>
    </section>
  );
}

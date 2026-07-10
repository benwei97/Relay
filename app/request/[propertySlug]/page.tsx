import { notFound } from "next/navigation";
import { createTicket } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const categories = ["Plumbing", "Electrical", "HVAC", "Appliance", "Handyman", "Pest", "Roofing", "General"];

export default async function PropertyRequestPage({ params }: { params: Promise<{ propertySlug: string }> }) {
  const { propertySlug } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: property } = await supabase
    .from("properties")
    .select("*, units(unit_number)")
    .eq("request_link_slug", propertySlug)
    .single();

  if (!property) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">{property.name}</p>
        <h1 className="mt-2 text-3xl font-semibold">Maintenance Request</h1>
        <p className="mt-2 text-muted-foreground">Relay will route your request and keep you updated by text.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tell us what needs repair</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTicket} className="grid gap-4">
            <input type="hidden" name="property_slug" value={propertySlug} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="tenant_name" placeholder="Full name" required />
              <Input name="tenant_phone" placeholder="Phone for SMS updates" required />
            </div>
            <Input name="tenant_email" type="email" placeholder="Email optional" />
            <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
              <Input name="unit_number" list="units" placeholder="Unit" required />
              <datalist id="units">
                {(property.units ?? []).map((unit: { unit_number: string }) => (
                  <option key={unit.unit_number} value={unit.unit_number} />
                ))}
              </datalist>
              <select
                name="category"
                required
                className="h-10 rounded-md border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                defaultValue=""
              >
                <option value="" disabled>
                  Issue category
                </option>
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </div>
            <Textarea name="description" placeholder="Describe the issue. Include what happened, where it is, and how long it has been happening." required />
            <Input name="files" type="file" multiple />
            <div className="grid gap-2 rounded-md border bg-muted p-3 text-sm sm:grid-cols-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="emergency_flag" />
                Urgent or emergency
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="active_water_leak" />
                Water leaking actively
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="gas_smell" />
                Gas smell
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="electrical_sparking" />
                Electrical sparking
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="permission_to_enter" />
                Permission to enter
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="pets_present" />
                Pets present
              </label>
            </div>
            <Textarea name="availability_windows" placeholder="Availability windows, for example: Tue 10 AM-12 PM, Wed after 2 PM" required />
            <Button>Submit request</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

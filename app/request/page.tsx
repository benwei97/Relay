import { createTicket } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function RequestPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Maintenance Request</h1>
        <p className="mt-2 text-muted-foreground">Submit the issue and your availability so the landlord can coordinate repair.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Request details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTicket} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="tenant_name" placeholder="Name" required />
              <Input name="tenant_phone" placeholder="Phone" required />
            </div>
            <Input name="tenant_email" type="email" placeholder="Email" required />
            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <Input name="property_address" placeholder="Property address" required />
              <Input name="unit_number" placeholder="Unit" />
            </div>
            <select
              name="request_type"
              required
              className="h-10 rounded-md border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              defaultValue=""
            >
              <option value="" disabled>
                Request type
              </option>
              <option>Plumbing</option>
              <option>Electrical</option>
              <option>HVAC</option>
              <option>Appliance</option>
              <option>Lock or access</option>
              <option>Pest</option>
              <option>General repair</option>
            </select>
            <Textarea name="description" placeholder="Describe the issue" required />
            <Textarea name="availability_windows" placeholder="Availability windows, for example: Tue 9-12, Thu after 3" />
            <Input name="files" type="file" multiple />
            <Button>Submit request</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

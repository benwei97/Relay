import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RequestIndexPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6">
      <Card>
        <CardHeader>
          <CardTitle>Property request link required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">
            Maintenance requests are submitted through a property-specific link from your landlord.
          </p>
          <Link href="/">Back home</Link>
        </CardContent>
      </Card>
    </main>
  );
}

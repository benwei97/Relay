import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function RequestSuccessPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6">
      <Card>
        <CardHeader>
          <CardTitle>Request received</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Relay is reviewing the request and your landlord can approve dispatch to the right contractor.
          </p>
          {token ? (
            <Button asChild>
              <Link href={`/status/${token}`}>View request status</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}

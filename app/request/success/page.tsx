import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function RequestSuccessPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6">
      <Card>
        <CardHeader>
          <CardTitle>Request submitted</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            The maintenance ticket has been created{id ? ` (${id})` : ""}. The landlord can now review it in the dashboard.
          </p>
          <Button asChild>
            <Link href="/">Back home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

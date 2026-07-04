import { signIn } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Landlord Login</CardTitle>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardHeader>
        <CardContent>
          <form action={signIn} className="space-y-4">
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="password" type="password" placeholder="Password" required />
            <Button className="w-full">Sign in</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

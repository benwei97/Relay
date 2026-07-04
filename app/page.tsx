import Link from "next/link";
import { ClipboardList, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-12">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-primary">Relay Maintenance</p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
            AI maintenance coordination for rental operators.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Intake tenant issues, summarize them with AI, assign contractors, and track job actions from one simple workflow.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/request">
                <ClipboardList className="h-4 w-4" />
                Submit Request
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                Landlord Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

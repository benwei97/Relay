import Link from "next/link";
import { Building2, Home, LogOut, UsersRound } from "lucide-react";
import { signOut } from "@/app/actions";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-lg font-semibold text-foreground no-underline">
            Relay Maintenance
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <Building2 className="h-4 w-4" />
                Tickets
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/properties">
                <Home className="h-4 w-4" />
                Properties
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/contractors">
                <UsersRound className="h-4 w-4" />
                Contractors
              </Link>
            </Button>
            <form action={signOut}>
              <Button variant="outline" size="sm">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </main>
  );
}

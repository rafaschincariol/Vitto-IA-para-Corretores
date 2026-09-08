import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { requireProfile } from "@/lib/data/auth";
import { AppSidebarNav } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { profile, tenant } = await requireProfile();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r bg-sidebar text-sidebar-foreground md:flex md:flex-col">
        <div className="border-b px-4 py-4">
          <p className="truncate text-sm font-semibold">{tenant.name}</p>
        </div>
        <AppSidebarNav className="flex-1 px-2 py-4" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2 md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Abrir menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetTitle className="px-4 pt-4">{tenant.name}</SheetTitle>
                <AppSidebarNav className="px-2 py-4" />
              </SheetContent>
            </Sheet>
            <p className="truncate text-sm font-semibold">{tenant.name}</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <UserMenu name={profile.full_name ?? ""} email={profile.email} />
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

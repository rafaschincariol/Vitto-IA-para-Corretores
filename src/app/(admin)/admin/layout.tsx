import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Building2, ShieldCheck } from "lucide-react";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

const NAV_ITEMS = [
  { href: "/admin", label: "Corretoras", icon: Building2 },
  { href: "/admin/global-knowledge", label: "Base de Conhecimento", icon: BookOpen },
];

// Grupo de rotas próprio, fora de (app): admin é um conceito de plataforma,
// não de corretora/tenant — não passa por requireProfile() nem por checagem
// de assinatura. Acesso restrito a quem está em public.platform_admins.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: isAdmin } = await supabase
    .from("platform_admins")
    .select("email")
    .eq("email", user.email ?? "")
    .maybeSingle();

  if (!isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="size-3.5" />
            </span>
            Painel Admin — Vitto
          </Link>
          <nav className="hidden items-center gap-4 sm:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu name="" email={user.email ?? ""} />
        </div>
      </header>

      <nav className="flex items-center gap-4 border-b px-4 py-2 sm:hidden">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}

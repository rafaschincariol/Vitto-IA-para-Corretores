"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, FileText, FolderOpen, Sparkles, Settings, CreditCard } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assistant", label: "Assistente IA", icon: Sparkles, highlight: true },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/policies", label: "Apólices", icon: FileText },
  { href: "/documents", label: "Documentos", icon: FolderOpen },
  { href: "/billing", label: "Assinatura", icon: CreditCard },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function AppSidebarNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-secondary-foreground"
                : item.highlight
                  ? "text-primary hover:bg-muted"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className={cn("size-4", !active && item.highlight && "text-primary")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

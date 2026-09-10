import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export function LegalFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <p>© {new Date().getFullYear()} {siteConfig.legalName}</p>
        <nav className="flex items-center gap-6">
          <Link href="/terms" className="hover:text-foreground">Termos de Uso</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacidade</Link>
          <a href={`mailto:${siteConfig.supportEmail}`} className="hover:text-foreground">
            {siteConfig.supportEmail}
          </a>
        </nav>
      </div>
    </footer>
  );
}

import { Trash2 } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export function AccountDeletionLockedScreen({ deletionDate }: { deletionDate: string }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <Trash2 className="size-10 text-muted-foreground" />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Conta programada para exclusão</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Essa corretora está programada para exclusão definitiva em{" "}
          {new Date(deletionDate).toLocaleDateString("pt-BR")}. O acesso fica bloqueado durante
          esse período. Se isso foi um engano, entre em contato com{" "}
          <a href={`mailto:${siteConfig.supportEmail}`} className="underline underline-offset-2">
            {siteConfig.supportEmail}
          </a>{" "}
          antes dessa data para cancelar a exclusão.
        </p>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubscriptionLockedScreen({
  isOwner,
  trialExpired,
}: {
  isOwner: boolean;
  trialExpired: boolean;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <Lock className="size-10 text-muted-foreground" />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          {trialExpired ? "Seu teste grátis acabou" : "Assinatura necessária"}
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {isOwner
            ? "Assine para continuar usando o painel da sua corretora."
            : "Peça para o Admin da corretora assinar para liberar o acesso da equipe."}
        </p>
      </div>
      {isOwner && (
        <Button asChild size="lg">
          <Link href="/billing">Assinar agora</Link>
        </Button>
      )}
    </div>
  );
}

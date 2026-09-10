"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { markPaidConversionTracked } from "./funnel-actions";

// Dois eventos de funil que só têm como disparar no próximo carregamento
// de página (não no momento exato em que acontecem no servidor):
// confirmação de e-mail (callback de auth, sem sessão de navegador pra
// empurrar no dataLayer) e conversão de trial em assinatura paga (webhook
// do Stripe, idem). Fica no layout do app pra pegar isso em qualquer
// página que o corretor abrir primeiro depois.
export function FunnelBeacon({ justConverted }: { justConverted: boolean }) {
  const searchParams = useSearchParams();
  const welcome = searchParams.get("welcome") === "1";

  useEffect(() => {
    if (welcome) trackEvent("email_confirmed");
  }, [welcome]);

  useEffect(() => {
    if (justConverted) {
      trackEvent("subscription_activated");
      void markPaidConversionTracked();
    }
  }, [justConverted]);

  return null;
}

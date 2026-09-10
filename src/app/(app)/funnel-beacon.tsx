"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { siteConfig } from "@/lib/site-config";
import { markPaidConversionTracked } from "./funnel-actions";

const priceValue = Number(siteConfig.price.replace(/[^\d,]/g, "").replace(",", "."));

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
    if (welcome) {
      trackEvent("email_confirmed");
      // Sem isso, o redirecionamento pós-confirmação caía direto no
      // dashboard sem nenhum sinal visual de que a conta ficou ativa.
      toast.success("Conta confirmada! Bem-vindo ao Vitto.");
    }
  }, [welcome]);

  useEffect(() => {
    if (justConverted) {
      // value/currency: sem isso, quando o GTM for ativado, Google
      // Ads/Meta só veem "aconteceu", sem base pra lance por valor/ROAS.
      trackEvent("subscription_activated", { value: priceValue, currency: "BRL" });
      void markPaidConversionTracked();
    }
  }, [justConverted]);

  return null;
}

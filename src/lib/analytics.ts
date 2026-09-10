"use client";

// Empurra um evento pro dataLayer do Google Tag Manager (ver
// src/app/layout.tsx). Sem GTM configurado, isso não faz nada — só
// preenche um array que ninguém lê. Use pra marcar conversões que
// interessam pra campanha paga (cadastro, início de assinatura).
export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const w = window as typeof window & { dataLayer?: Record<string, unknown>[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event: eventName, ...params });
}

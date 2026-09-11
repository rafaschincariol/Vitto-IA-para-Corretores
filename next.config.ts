import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// Turbopack/React usam eval() em desenvolvimento (HMR, reconstrução de stack
// trace) — nunca em produção (ver next.config docs). Sem isso, o CSP quebra o
// dev server; em produção o script-src continua sem 'unsafe-eval'.
const isDev = process.env.NODE_ENV !== "production";

// Google Tag Manager + o que ele injeta (tag de conversão do Google Ads)
// precisam desses domínios liberados no CSP, senão o navegador bloqueia o
// próprio gtm.js de carregar — o script no layout.tsx fica no HTML mas
// nunca executa. GTM_SCRIPT_DOMAINS cobre o carregamento do contêiner e
// da tag de conversão; GTM_CONNECT_DOMAINS cobre os pings de conversão que
// essas tags disparam via fetch/beacon.
const GTM_SCRIPT_DOMAINS = "https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net";
const GTM_CONNECT_DOMAINS = "https://www.googletagmanager.com https://www.google-analytics.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.google.com";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com ${GTM_SCRIPT_DOMAINS}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://www.googletagmanager.com https://www.google.com https://googleads.g.doubleclick.net`,
  "font-src 'self' data:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://va.vercel-scripts.com https://vitals.vercel-insights.com ${GTM_CONNECT_DOMAINS}`,
  "frame-src https://www.googletagmanager.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "vitto-ia-para-corretores",
  project: "corretor-saas",
  silent: true,
  telemetry: false,
  widenClientFileUpload: true,
});

import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

// Sem lastModified: não temos data real de última alteração de conteúdo por
// página (nem CMS, nem controle de versão consultável em runtime) — um
// valor recalculado a cada build/request só mentiria "mudou agora" pro
// crawler, o que é pior do que simplesmente omitir o campo.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteConfig.url, changeFrequency: "weekly", priority: 1 },
    { url: `${siteConfig.url}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteConfig.url}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteConfig.url}/login`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${siteConfig.url}/signup`, changeFrequency: "yearly", priority: 0.8 },
  ];
}

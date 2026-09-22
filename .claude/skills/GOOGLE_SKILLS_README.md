# Skills vendorizadas de google/skills

As 147 pastas de skill neste diretório (todas exceto `setup-instagram`, que é
própria deste projeto) foram copiadas do repositório oficial do Google:

- Origem: https://github.com/google/skills
- Commit: `d6b9f75668ed1450a87ea12a8de57e02f33cc7b4`
- Data: 2026-09-21
- Licença: Apache License 2.0 (texto completo em `GOOGLE_SKILLS_LICENSE.txt`,
  conforme exigido pela seção 4 da licença ao redistribuir)

Cobrem majoritariamente Google Cloud (GKE, BigQuery, Cloud SQL, Spanner,
Firebase, IAM, Cloud Monitoring/Logging, SecOps, Gemini API/Agent Platform,
Genkit), além de Google Ads e Google Analytics. Nenhuma delas foi modificada
em relação ao conteúdo original do repositório de origem.

Nenhuma dessas skills é usada pela stack deste projeto hoje (Next.js +
Supabase + Vercel, sem Google Cloud) — foram instaladas a pedido, para
disponibilizar o catálogo oficial do Google no Claude Code deste
repositório. Se a lista ficar desatualizada, repita a clonagem de
`google/skills` e recopie as pastas de `skills/*/*`.

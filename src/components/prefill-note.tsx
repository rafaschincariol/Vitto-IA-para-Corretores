import type { ProfileField } from "@/lib/data/client-financial-profile";

// Aviso discreto embaixo de um campo pré-preenchido a partir de outra
// simulação do mesmo cliente (ver client-financial-profile.ts). Sempre junto
// do valor, nunca escondido — o corretor precisa saber que aquele número não
// foi digitado agora.
export function PrefillNote({ field }: { field: ProfileField }) {
  return (
    <p className="text-xs text-primary">
      Preenchido a partir de outra simulação deste cliente — {field.source} (
      {new Date(field.asOf).toLocaleDateString("pt-BR")}). Confira antes de salvar.
    </p>
  );
}

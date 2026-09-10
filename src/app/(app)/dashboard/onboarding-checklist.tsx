"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dismissOnboardingChecklist } from "./actions";

type Step = {
  label: string;
  done: boolean;
  href: string;
  cta: string;
  optional?: boolean;
};

export function OnboardingChecklist({
  hasPolicies,
  askedAssistant,
  hasTeam,
}: {
  hasPolicies: boolean;
  askedAssistant: boolean;
  hasTeam: boolean;
}) {
  const [hidden, setHidden] = useState(false);
  const [pending, setPending] = useState(false);

  const steps: Step[] = [
    { label: "Cadastre suas apólices", done: hasPolicies, href: "/documents", cta: "Enviar apólice" },
    { label: "Pergunte ao assistente de IA", done: askedAssistant, href: "/assistant", cta: "Perguntar" },
    {
      label: "Convide sua equipe (se tiver)",
      done: hasTeam,
      href: "/settings",
      cta: "Convidar",
      optional: true,
    },
  ];

  const requiredDone = steps.filter((s) => !s.optional).every((s) => s.done);
  if (hidden || requiredDone) return null;

  async function handleDismiss() {
    setPending(true);
    await dismissOnboardingChecklist();
    setPending(false);
    setHidden(true);
  }

  return (
    <div className="rounded-lg border p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-medium">Primeiros passos</h2>
          <p className="text-sm text-muted-foreground">
            O essencial pra tirar o máximo proveito do Vitto.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleDismiss}
          disabled={pending}
          aria-label="Esconder checklist"
          title="Esconder"
        >
          <X className="size-4" />
        </Button>
      </div>

      <ul className="mt-4 space-y-2.5">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-3">
            <span
              className={
                step.done
                  ? "flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  : "flex size-5 shrink-0 items-center justify-center rounded-full border border-border"
              }
            >
              {step.done && <Check className="size-3" />}
            </span>
            <span className={`flex-1 text-sm ${step.done ? "text-muted-foreground line-through" : ""}`}>
              {step.label}
              {step.optional && !step.done && (
                <span className="ml-1.5 text-xs text-muted-foreground">(opcional)</span>
              )}
            </span>
            {!step.done && (
              <Button asChild variant="outline" size="sm">
                <Link href={step.href}>{step.cta}</Link>
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

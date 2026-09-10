"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PLACEHOLDER_EXAMPLES = [
  "Quais apólices vencem essa semana?",
  "Qual o prêmio total da minha carteira?",
  "Resuma a carteira do cliente João",
];

// Ponto de entrada da IA logo no topo do Dashboard — não só no menu. A
// pergunta é enviada pra /assistant via query param; quem processa e
// manda pro modelo de verdade é o AssistantChat (chat.tsx), que lê esse
// param ao montar.
export function AssistantQuickAsk() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const placeholder = PLACEHOLDER_EXAMPLES[0];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const question = value.trim();
    router.push(question ? `/assistant?q=${encodeURIComponent(question)}` : "/assistant");
  }

  return (
    <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-transparent p-4 sm:p-5">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4.5" />
          </span>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Pergunte ao Vitto — ex: "${placeholder}"`}
            className="h-10 border-none bg-background/60 shadow-none focus-visible:ring-1"
          />
        </div>
        <Button type="submit" className="sm:w-auto">
          Perguntar
          <ArrowRight className="size-4" />
        </Button>
      </form>
    </div>
  );
}

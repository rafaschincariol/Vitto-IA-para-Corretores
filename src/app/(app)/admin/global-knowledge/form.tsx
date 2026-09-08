"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ingestGlobalKnowledge, type GlobalKnowledgeState } from "./actions";

const initialState: GlobalKnowledgeState = { error: null };

export function GlobalKnowledgeForm() {
  const [state, formAction, pending] = useActionState(ingestGlobalKnowledge, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-4 rounded-md border p-4">
      <div className="space-y-2">
        <Label htmlFor="source_name">Nome da fonte</Label>
        <Input id="source_name" name="source_name" placeholder="Ex: Porto Seguro — Condições Gerais Auto" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">Texto</Label>
        <Textarea
          id="content"
          name="content"
          rows={10}
          placeholder="Cole aqui o texto das condições gerais / manual da seguradora..."
          required
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Indexando..." : "Indexar na base global"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateTenantName, type SettingsFormState } from "./actions";

const initialState: SettingsFormState = { error: null };

export function SettingsForm({ tenantName }: { tenantName: string }) {
  const [state, formAction, pending] = useActionState(updateTenantName, initialState);

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da corretora</Label>
        <Input id="name" name="name" defaultValue={tenantName} required />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}

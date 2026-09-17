import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { Button } from "@/components/ui/button";
import { SimuladorForm } from "../simulador-form";
import type { Client } from "@/lib/types";

export default async function NovaPrestamistaPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>;
}) {
  await requireProfile();
  const { client_id } = await searchParams;
  const supabase = await createSupabaseClient();

  let client: Pick<Client, "id" | "name"> | null = null;
  if (client_id) {
    const { data } = await supabase.from("clients").select("id, name").eq("id", client_id).maybeSingle<Pick<Client, "id" | "name">>();
    client = data ?? null;
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href="/prestamista">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Nova simulação de seguro prestamista</h1>
      </div>

      <SimuladorForm clientId={client?.id ?? null} clientName={client?.name ?? null} />
    </div>
  );
}

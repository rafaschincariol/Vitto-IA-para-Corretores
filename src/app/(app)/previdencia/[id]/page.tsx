import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { getPrevidenciaSimulacao } from "@/lib/data/previdencia";
import { Button } from "@/components/ui/button";
import { SimuladorForm } from "../simulador-form";

export default async function PrevidenciaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  await requireProfile();
  const { id } = await params;
  const supabase = await createSupabaseClient();

  const simulacao = await getPrevidenciaSimulacao(supabase, id);
  if (!simulacao) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href="/previdencia">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{simulacao.client_name}</h1>
      </div>

      <SimuladorForm simulacao={simulacao} clientId={simulacao.client_id} clientName={simulacao.client_name} />
    </div>
  );
}

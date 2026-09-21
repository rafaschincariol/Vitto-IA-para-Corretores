import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { getPendingDrafts, getApprovedDrafts } from "@/lib/data/growth";
import { ReviewQueue } from "./review-queue";

export default async function GrowthReviewPage() {
  const supabase = await createSupabaseClient();
  const [pending, approved] = await Promise.all([getPendingDrafts(supabase), getApprovedDrafts(supabase)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fila de aprovação</h1>
        <p className="text-sm text-muted-foreground">
          Todo rascunho gerado por IA passa por aqui antes de ir pro ar — nada é enviado sem revisão humana.
        </p>
      </div>

      <ReviewQueue pending={pending} approved={approved} />
    </div>
  );
}

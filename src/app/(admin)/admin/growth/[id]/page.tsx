import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { getGrowthLead, getDraftsForLead } from "@/lib/data/growth";
import { Button } from "@/components/ui/button";
import { LeadDetail } from "./lead-detail";

export default async function GrowthLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseClient();

  const lead = await getGrowthLead(supabase, id);
  if (!lead) notFound();

  const drafts = await getDraftsForLead(supabase, id);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href="/admin/growth">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{lead.contact_name}</h1>
        <p className="text-sm text-muted-foreground">{lead.company_name ?? lead.email}</p>
      </div>

      <LeadDetail lead={lead} drafts={drafts} />
    </div>
  );
}

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { getOrSeedPipelineStages, getProspectsBoard } from "@/lib/data/pipeline";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PipelineBoard } from "./pipeline-board";
import { ProspectsTable } from "./prospects-table";
import { ProspectFormDialog } from "./prospect-form-dialog";
import { StageSettingsDialog } from "./stage-settings-dialog";
import { ImportProspectsDialog } from "./import-prospects-dialog";
import { ExportProspectsButton } from "./export-prospects-button";
import type { Profile } from "@/lib/types";

export default async function PipelinePage() {
  const { profile, tenant } = await requireProfile();
  const isOwner = profile.role === "owner";
  const supabase = await createSupabaseClient();

  const [stages, prospects, { data: teamMembers }] = await Promise.all([
    getOrSeedPipelineStages(supabase, tenant.id),
    getProspectsBoard(supabase, tenant.id),
    isOwner
      ? supabase.from("profiles").select("id, full_name, email").returns<Profile[]>()
      : Promise.resolve({ data: [] as Profile[] }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Funil de Vendas</h1>
          <p className="text-sm text-muted-foreground">
            {isOwner ? "Prospects de toda a corretora." : "Prospects atribuídos a você."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/pipeline/analytics">
              <BarChart3 className="size-4" />
              Analytics
            </Link>
          </Button>
          <StageSettingsDialog stages={stages} />
          <ImportProspectsDialog stages={stages} />
          <ExportProspectsButton prospects={prospects} />
          <ProspectFormDialog stages={stages} isOwner={isOwner} teamMembers={teamMembers ?? []} />
        </div>
      </div>

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">Quadro</TabsTrigger>
          <TabsTrigger value="list">Lista</TabsTrigger>
        </TabsList>
        <TabsContent value="board" className="mt-4">
          <PipelineBoard
            stages={stages}
            prospects={prospects}
            isOwner={isOwner}
            teamMembers={teamMembers ?? []}
          />
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <ProspectsTable
            prospects={prospects}
            stages={stages}
            isOwner={isOwner}
            teamMembers={teamMembers ?? []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

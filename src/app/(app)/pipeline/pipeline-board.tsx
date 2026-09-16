"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProspectFormDialog } from "./prospect-form-dialog";
import { moveProspectStage, reorderProspectsInStage } from "./actions";
import type { PipelineStage, ProspectWithStage, Profile } from "@/lib/types";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function ProspectCard({
  prospect,
  stages,
  isOwner,
  teamMembers,
}: {
  prospect: ProspectWithStage;
  stages: PipelineStage[];
  isOwner: boolean;
  teamMembers: Pick<Profile, "id" | "full_name" | "email">[];
}) {
  // O manuseio de drag fica só no ícone (GripVertical) — se o card inteiro
  // escutasse o pointer down, um clique no botão de editar seria capturado
  // pelo dnd-kit em vez de abrir o diálogo.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: prospect.id,
    data: { stageId: prospect.stage_id },
  });

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }}>
      <Card className={`gap-2 py-3 ${isDragging ? "opacity-50" : ""}`}>
        <CardContent className="flex items-start gap-2 px-3">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
            aria-label="Arrastar prospect"
          >
            <GripVertical className="size-4" />
          </button>
          <ProspectFormDialog
            stages={stages}
            prospect={prospect}
            isOwner={isOwner}
            teamMembers={teamMembers}
            trigger={
              <div className="min-w-0 flex-1 cursor-pointer space-y-1.5 text-left">
                <p className="text-sm font-medium leading-tight">{prospect.name}</p>
                {prospect.insurance_type && (
                  <p className="text-xs text-muted-foreground">{prospect.insurance_type}</p>
                )}
                {prospect.estimated_value !== null && (
                  <p className="text-xs font-medium text-primary">
                    {currencyFormatter.format(prospect.estimated_value)}
                  </p>
                )}
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StageColumn({
  stage,
  prospects,
  stages,
  isOwner,
  teamMembers,
}: {
  stage: PipelineStage;
  prospects: ProspectWithStage[];
  stages: PipelineStage[];
  isOwner: boolean;
  teamMembers: Pick<Profile, "id" | "full_name" | "email">[];
}) {
  const { setNodeRef } = useDroppable({ id: stage.id, data: { stageId: stage.id } });
  const totalValue = prospects.reduce((sum, p) => sum + (p.estimated_value ?? 0), 0);

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-md border bg-muted/30">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{stage.name}</p>
          {stage.is_won && <Badge className="bg-emerald-600 text-white">Ganho</Badge>}
          {stage.is_lost && <Badge variant="destructive">Perdido</Badge>}
        </div>
        <Badge variant="outline">{prospects.length}</Badge>
      </div>
      {totalValue > 0 && (
        <p className="border-b px-3 py-1.5 text-xs text-muted-foreground">{currencyFormatter.format(totalValue)}</p>
      )}
      <div ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-2 p-2">
        <SortableContext items={prospects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {prospects.map((prospect) => (
            <ProspectCard
              key={prospect.id}
              prospect={prospect}
              stages={stages}
              isOwner={isOwner}
              teamMembers={teamMembers}
            />
          ))}
        </SortableContext>
        {prospects.length === 0 && (
          <p className="px-1 py-4 text-center text-xs text-muted-foreground">Arraste um card pra cá</p>
        )}
      </div>
    </div>
  );
}

export function PipelineBoard({
  stages,
  prospects,
  isOwner = false,
  teamMembers = [],
}: {
  stages: PipelineStage[];
  prospects: ProspectWithStage[];
  isOwner?: boolean;
  teamMembers?: Pick<Profile, "id" | "full_name" | "email">[];
}) {
  const [board, setBoard] = useState(() => groupByStage(stages, prospects));
  // Reseta o board quando o servidor manda props novas (criação/importação
  // de prospect, ou o próprio revalidatePath depois de um drag) — ajuste de
  // estado durante a renderização, padrão recomendado do React pra
  // "resetar estado quando uma prop muda", em vez de um useEffect com
  // setState (que dispara um re-render em cascata extra).
  const [prevProspects, setPrevProspects] = useState(prospects);
  if (prospects !== prevProspects) {
    setPrevProspects(prospects);
    setBoard(groupByStage(stages, prospects));
  }
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const flatProspects = useMemo(() => Object.values(board).flat(), [board]);

  function findStageOfCard(cardId: string): string | null {
    for (const [stageId, list] of Object.entries(board)) {
      if (list.some((p) => p.id === cardId)) return stageId;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const sourceStageId = findStageOfCard(activeId);
    // "over" é ou uma coluna (id de etapa) ou outro card (cuja etapa pegamos do data).
    const destStageId =
      (over.data.current?.stageId as string | undefined) ?? (stages.some((s) => s.id === overId) ? overId : null);

    if (!sourceStageId || !destStageId) return;

    const moved = board[sourceStageId]?.find((p) => p.id === activeId);
    if (!moved) return;

    const nextBoard = { ...board };
    nextBoard[sourceStageId] = nextBoard[sourceStageId].filter((p) => p.id !== activeId);

    const destList = [...(nextBoard[destStageId] ?? [])];
    const overIndex = destList.findIndex((p) => p.id === overId);
    const insertAt = overIndex >= 0 ? overIndex : destList.length;
    destList.splice(insertAt, 0, { ...moved, stage_id: destStageId });
    nextBoard[destStageId] = destList;

    setBoard(nextBoard);

    startTransition(async () => {
      if (sourceStageId !== destStageId) {
        const result = await moveProspectStage(activeId, destStageId);
        if (result.error) {
          toast.error(result.error);
          router.refresh();
          return;
        }
      }
      await reorderProspectsInStage(nextBoard[destStageId].map((p) => p.id));
      if (sourceStageId !== destStageId) {
        await reorderProspectsInStage(nextBoard[sourceStageId].map((p) => p.id));
      }
    });
  }

  const activeCard = activeId ? flatProspects.find((p) => p.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            prospects={board[stage.id] ?? []}
            stages={stages}
            isOwner={isOwner}
            teamMembers={teamMembers}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard && (
          <Card className="w-72 gap-2 py-3 shadow-lg">
            <CardContent className="space-y-1.5 px-3">
              <p className="text-sm font-medium leading-tight">{activeCard.name}</p>
            </CardContent>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function groupByStage(stages: PipelineStage[], prospects: ProspectWithStage[]) {
  const board: Record<string, ProspectWithStage[]> = {};
  for (const stage of stages) board[stage.id] = [];
  for (const prospect of prospects) {
    if (!board[prospect.stage_id]) board[prospect.stage_id] = [];
    board[prospect.stage_id].push(prospect);
  }
  return board;
}

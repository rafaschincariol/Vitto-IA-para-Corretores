"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createStage, deleteStage, renameStage, reorderStage } from "./actions";
import type { PipelineStage } from "@/lib/types";

function StageRow({ stage, isFirst, isLast }: { stage: PipelineStage; isFirst: boolean; isLast: boolean }) {
  const [name, setName] = useState(stage.name);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function commitRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === stage.name) {
      setName(stage.name);
      return;
    }
    startTransition(async () => {
      const result = await renameStage(stage.id, trimmed);
      if (result.error) {
        toast.error(result.error);
        setName(stage.name);
      } else {
        toast.success("Etapa renomeada.");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-md border p-2">
      <div className="flex flex-col">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          disabled={isFirst || pending}
          onClick={() =>
            startTransition(async () => {
              const result = await reorderStage(stage.id, "up");
              if (result.error) toast.error(result.error);
              else router.refresh();
            })
          }
        >
          <ArrowUp className="size-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          disabled={isLast || pending}
          onClick={() =>
            startTransition(async () => {
              const result = await reorderStage(stage.id, "down");
              if (result.error) toast.error(result.error);
              else router.refresh();
            })
          }
        >
          <ArrowDown className="size-3" />
        </Button>
      </div>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitRename}
        disabled={pending}
        className="h-8"
      />
      {stage.is_won && <Badge className="bg-emerald-600 text-white">Ganho</Badge>}
      {stage.is_lost && <Badge variant="destructive">Perdido</Badge>}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={pending}
        aria-label="Excluir etapa"
        onClick={() => {
          if (!window.confirm(`Excluir a etapa "${stage.name}"?`)) return;
          startTransition(async () => {
            const result = await deleteStage(stage.id);
            if (result.error) {
              toast.error(result.error);
              return;
            }
            toast.success("Etapa excluída.");
            router.refresh();
          });
        }}
      >
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </div>
  );
}

export function StageSettingsDialog({ stages }: { stages: PipelineStage[] }) {
  const [open, setOpen] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [creating, startCreating] = useTransition();
  const router = useRouter();

  function handleCreate() {
    const trimmed = newStageName.trim();
    if (!trimmed) return;
    startCreating(async () => {
      const result = await createStage(trimmed);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Etapa criada.");
      setNewStageName("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings2 className="size-4" />
          Etapas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Etapas do funil</DialogTitle>
          <DialogDescription>
            Crie, renomeie, reordene ou exclua as etapas. Uma etapa só pode ser excluída se estiver vazia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {stages
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((stage, index) => (
              <StageRow key={stage.id} stage={stage} isFirst={index === 0} isLast={index === stages.length - 1} />
            ))}
        </div>

        <div className="flex gap-2 border-t pt-4">
          <Input
            placeholder="Nome da nova etapa"
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreate())}
          />
          <Button type="button" onClick={handleCreate} disabled={creating || !newStageName.trim()}>
            <Plus className="size-4" />
            Adicionar
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => setOpen(false)}>
            Concluído
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

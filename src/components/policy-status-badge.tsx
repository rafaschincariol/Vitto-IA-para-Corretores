import { Badge } from "@/components/ui/badge";
import { POLICY_STATUS_LABELS, type PolicyStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<PolicyStatus, string> = {
  ativo: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  em_renovacao: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  cancelado: "bg-muted text-muted-foreground",
  vencido: "bg-destructive/15 text-destructive",
};

export function PolicyStatusBadge({ status }: { status: PolicyStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", STATUS_STYLES[status])}>
      {POLICY_STATUS_LABELS[status]}
    </Badge>
  );
}

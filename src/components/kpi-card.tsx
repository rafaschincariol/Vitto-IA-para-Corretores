import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTooltip } from "@/components/info-tooltip";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function KpiCard({
  title,
  value,
  icon: Icon,
  tooltip,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  /** Explicação da fórmula/critério por trás do número — só pra KPIs calculados que não são autoexplicativos. */
  tooltip?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          {title}
          {tooltip && <InfoTooltip>{tooltip}</InfoTooltip>}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

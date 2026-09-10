"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CircleAlert, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { ActivityLogCategory, ActivityLogRow } from "@/lib/data/admin";
import { cn } from "cn";

const LEVEL_ICON = {
  info: Info,
  aviso: AlertTriangle,
  erro: CircleAlert,
};

const LEVEL_COLOR = {
  info: "text-muted-foreground",
  aviso: "text-amber-600 dark:text-amber-400",
  erro: "text-destructive",
};

const CATEGORY_LABEL: Record<ActivityLogCategory, string> = {
  sistema: "Sistema",
  usuario: "Usuário",
};

type FilterCategory = "todos" | ActivityLogCategory;

export function ActivityLogList({ logs }: { logs: ActivityLogRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterCategory>("todos");

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (filter !== "todos" && log.category !== filter) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        (log.tenant_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [logs, filter, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5">
          {(["todos", "sistema", "usuario"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                filter === c
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {c === "todos" ? "Tudo" : CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
        <Input
          placeholder="Buscar por texto ou corretora..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>

      <div className="rounded-md border divide-y">
        {filtered.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Nenhum evento encontrado{query || filter !== "todos" ? " com esse filtro." : " ainda."}
          </p>
        )}
        {filtered.map((log) => {
          const Icon = LEVEL_ICON[log.level];
          return (
            <div key={log.id} className="flex items-start gap-3 p-3">
              <Icon className={cn("mt-0.5 size-4 shrink-0", LEVEL_COLOR[log.level])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{log.message}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="h-5">
                    {CATEGORY_LABEL[log.category]}
                  </Badge>
                  {log.tenant_name && <span>{log.tenant_name}</span>}
                  <span>
                    {new Date(log.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

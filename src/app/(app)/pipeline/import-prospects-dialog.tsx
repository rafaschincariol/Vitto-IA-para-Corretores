"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { parseProspectsSpreadsheet } from "./parse-prospects";
import { bulkCreateProspects, type ParsedProspectRow } from "./actions";
import type { PipelineStage } from "@/lib/types";

export function ImportProspectsDialog({ stages }: { stages: PipelineStage[] }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedProspectRow[] | null>(null);
  const [rowErrors, setRowErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, startImport] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    setParsing(true);
    setFileName(file.name);
    try {
      const { rows: parsedRows, rowErrors: errors } = await parseProspectsSpreadsheet(file);
      setRows(parsedRows);
      setRowErrors(errors);
    } catch {
      toast.error("Não foi possível ler a planilha. Verifique se é um arquivo .xlsx, .xls ou .csv válido.");
      setRows(null);
    } finally {
      setParsing(false);
    }
  }

  function reset() {
    setRows(null);
    setRowErrors([]);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleImport() {
    if (!rows || rows.length === 0) return;
    startImport(async () => {
      const result = await bulkCreateProspects(rows);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.skipped.length > 0) {
        toast.warning(`${result.inserted} importado(s), ${result.skipped.length} linha(s) ignorada(s) por dados inválidos.`);
      } else {
        toast.success(`${result.inserted} prospect(s) importado(s).`);
      }
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="size-4" />
          Importar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar prospects via planilha</DialogTitle>
          <DialogDescription>
            Arquivo .xlsx, .xls ou .csv com colunas Nome, CPF/CNPJ, E-mail, Telefone, Valor estimado, Tipo de
            seguro e Etapa (em qualquer ordem — só Nome é obrigatório). Se a Etapa não bater com nenhuma etapa
            existente ({stages.map((s) => s.name).join(", ")}), o prospect entra na primeira.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          {!rows && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => inputRef.current?.click()}
              disabled={parsing}
            >
              <Upload className="size-4" />
              {parsing ? "Lendo planilha..." : "Selecionar planilha"}
            </Button>
          )}

          {rows && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{fileName}</span>
                <Button type="button" variant="ghost" size="sm" onClick={reset}>
                  Trocar arquivo
                </Button>
              </div>

              {rowErrors.length > 0 && (
                <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  {rowErrors.length} linha(s) ignorada(s):
                  <ul className="mt-1 list-disc pl-4">
                    {rowErrors.slice(0, 5).map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                    {rowErrors.length > 5 && <li>e mais {rowErrors.length - 5}...</li>}
                  </ul>
                </div>
              )}

              {rows.length === 0 ? (
                <p className="text-sm text-destructive">
                  Nenhuma linha válida encontrada. Confira se a planilha tem uma coluna &ldquo;Nome&rdquo;.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Etapa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {row.email ?? row.phone ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{row.stage_name ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleImport} disabled={!rows || rows.length === 0 || importing}>
            {importing ? "Importando..." : rows ? `Importar ${rows.length} prospect(s)` : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

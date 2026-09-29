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
import { parseLeadsSpreadsheet, type ParsedLeadRow } from "./parse-leads";
import { bulkImportLeads } from "./actions";

export function ImportLeadsDialog() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedLeadRow[] | null>(null);
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
      const { rows: parsedRows, rowErrors: errors } = await parseLeadsSpreadsheet(file);
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
      const result = await bulkImportLeads(rows);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.skipped.length > 0) {
        toast.warning(`${result.inserted} importado(s), ${result.skipped.length} linha(s) ignorada(s) por dados inválidos.`);
      } else {
        toast.success(`${result.inserted} lead(s) importado(s). Duplicados por e-mail são pulados automaticamente.`);
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
          Importar leads
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar leads via planilha</DialogTitle>
          <DialogDescription>
            Arquivo .xlsx, .xls ou .csv com colunas Nome, E-mail, Empresa, Telefone, CPF/CNPJ, Cidade e UF (em
            qualquer ordem — só Nome e E-mail são obrigatórios). Leads com e-mail já cadastrado são pulados, nunca
            sobrescritos.
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
                  Nenhuma linha válida encontrada. Confira se a planilha tem colunas &ldquo;Nome&rdquo; e
                  &ldquo;E-mail&rdquo;.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>E-mail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.contact_name}</TableCell>
                          <TableCell>{row.company_name ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{row.email}</TableCell>
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
            {importing ? "Importando..." : rows ? `Importar ${rows.length} lead(s)` : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

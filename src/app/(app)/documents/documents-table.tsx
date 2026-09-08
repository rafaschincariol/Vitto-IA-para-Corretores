"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { DocumentReviewDialog } from "./document-review-dialog";
import { getSignedDocumentUrl, deleteDocumentRecord } from "./actions";
import type { Document } from "@/lib/types";

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function DocumentsTable({
  documents,
  showClientColumn = false,
  clientNames = {},
}: {
  documents: Document[];
  showClientColumn?: boolean;
  clientNames?: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();

  function openDocument(storagePath: string) {
    startTransition(async () => {
      const url = await getSignedDocumentUrl(storagePath);
      if (!url) {
        toast.error("Não foi possível abrir o documento.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Arquivo</TableHead>
            {showClientColumn && <TableHead>Cliente</TableHead>}
            <TableHead>Tamanho</TableHead>
            <TableHead>Enviado em</TableHead>
            <TableHead className="w-24 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length === 0 && (
            <TableRow>
              <TableCell colSpan={showClientColumn ? 5 : 4} className="text-center text-muted-foreground">
                Nenhum documento enviado.
              </TableCell>
            </TableRow>
          )}
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="max-w-64 truncate font-medium">
                <span className="inline-flex items-center gap-2">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  {doc.original_filename}
                </span>
              </TableCell>
              {showClientColumn && (
                <TableCell className="text-muted-foreground">
                  {doc.client_id ? (
                    clientNames[doc.client_id] ?? "—"
                  ) : (
                    <DocumentReviewDialog documentId={doc.id} filename={doc.original_filename} />
                  )}
                </TableCell>
              )}
              <TableCell className="text-muted-foreground">{formatSize(doc.file_size)}</TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(doc.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Abrir documento"
                    disabled={pending}
                    onClick={() => openDocument(doc.storage_path)}
                  >
                    <ExternalLink className="size-4" />
                  </Button>
                  <ConfirmDeleteButton id={doc.id} label="documento" action={deleteDocumentRecord} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

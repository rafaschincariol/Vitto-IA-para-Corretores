"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createDocumentRecord } from "./actions";
import { autoProcessDocument } from "./auto-process-actions";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const AUTO_PROCESS_CONCURRENCY = 3;

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let index = 0;
  async function next(): Promise<void> {
    const i = index++;
    if (i >= items.length) return;
    await worker(items[i]);
    return next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
}

export function DocumentDropzone({
  tenantId,
  clientId,
  policyId,
}: {
  tenantId: string;
  clientId?: string;
  policyId?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Sem clientId (upload em /documents, fora do perfil de um cliente): cada
  // apólice enviada já vira cadastro de cliente + apólice automaticamente
  // (zero digitação), marcado como não revisado até o corretor confirmar em
  // /documents/review. Com clientId (upload dentro de um cliente existente),
  // o documento só é anexado — não faz sentido criar outro cliente.
  const autoProcess = !clientId;

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    const validFiles = Array.from(files).filter((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: formato não suportado (use PDF, PNG ou JPEG).`);
        return false;
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast.error(`${file.name}: arquivo maior que 20MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      setUploading(false);
      return;
    }

    setProgress({ done: 0, total: validFiles.length });
    const supabase = createClient();
    const documentIds: string[] = [];
    let uploadFailures = 0;

    await runWithConcurrency(validFiles, 4, async (file) => {
      const storagePath = `${tenantId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file, { contentType: file.type });

      if (uploadError) {
        toast.error(`${file.name}: falha no upload.`);
        uploadFailures++;
        setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
        return;
      }

      const result = await createDocumentRecord({
        storage_path: storagePath,
        original_filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        client_id: clientId,
        policy_id: policyId,
      });

      if (result.error) {
        toast.error(`${file.name}: ${result.error}`);
        uploadFailures++;
      } else if (result.documentId) {
        documentIds.push(result.documentId);
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    });

    if (autoProcess && documentIds.length > 0) {
      setProgress({ done: 0, total: documentIds.length });
      let created = 0;
      let failed = 0;

      await runWithConcurrency(documentIds, AUTO_PROCESS_CONCURRENCY, async (docId) => {
        const result = await autoProcessDocument(docId);
        if (result.error) failed++;
        else created++;
        setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
      });

      if (created > 0) {
        toast.success(`${created} apólice(s) cadastrada(s) automaticamente pela IA.`, {
          description: "Confira os dados antes de confirmar o cadastro.",
          action: { label: "Revisar agora", onClick: () => router.push("/documents/review") },
        });
      }
      if (failed > 0) {
        toast.error(`${failed} documento(s) não puderam ser processados pela IA.`);
      }
    } else if (uploadFailures === 0) {
      toast.success("Documento(s) enviado(s).");
    }

    setUploading(false);
    setProgress(null);
    router.refresh();
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    void uploadFiles(e.dataTransfer.files);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-center transition-colors",
        isDragging ? "border-primary bg-muted" : "border-border hover:bg-muted/50"
      )}
    >
      <UploadCloud className="size-8 text-muted-foreground" />
      <p className="text-sm font-medium">
        {uploading
          ? progress
            ? `Processando ${progress.done}/${progress.total}...`
            : "Enviando..."
          : "Arraste arquivos aqui ou clique para selecionar"}
      </p>
      <p className="text-xs text-muted-foreground">
        {autoProcess
          ? "PDF, PNG ou JPEG · até 20MB · envie vários de uma vez para cadastro automático"
          : "PDF, PNG ou JPEG · até 20MB"}
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => void uploadFiles(e.target.files)}
      />
    </div>
  );
}

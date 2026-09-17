"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractAssetsFromDocument } from "./actions";
import type { Asset } from "@/lib/sucessao/types";

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

export function ImportAssetsButton({ onExtracted }: { onExtracted: (assets: Asset[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Formato não suportado (use PDF, PNG ou JPEG).");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Arquivo maior que 8MB.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await extractAssetsFromDocument(formData);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.assets) {
        onExtracted(res.assets);
        toast.success(`${res.assets.length} bem(ns) importado(s) do documento.`, {
          description: "Confira os valores antes de salvar a simulação.",
        });
      }
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
        {loading ? "Analisando documento..." : "Importar de um PDF"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClientFormDialog } from "./client-form-dialog";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { deleteClientRecord } from "./actions";
import type { Client, Profile } from "@/lib/types";

export function ClientsTable({
  clients,
  isOwner = false,
  teamMembers = [],
}: {
  clients: Client[];
  isOwner?: boolean;
  teamMembers?: Pick<Profile, "id" | "full_name" | "email">[];
}) {
  const [query, setQuery] = useState("");
  const memberNames = Object.fromEntries(teamMembers.map((m) => [m.id, m.full_name ?? m.email]));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.cpf_cnpj, c.email, c.phone].some((field) => field?.toLowerCase().includes(q))
    );
  }, [clients, query]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, CPF/CNPJ, e-mail ou telefone..."
          className="pl-8"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF/CNPJ</TableHead>
              <TableHead>Contato</TableHead>
              {isOwner && <TableHead>Responsável</TableHead>}
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={isOwner ? 5 : 4} className="text-center text-muted-foreground">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">
                  <Link href={`/clients/${client.id}`} className="hover:underline">
                    {client.name}
                  </Link>
                  {!client.reviewed && (
                    <Badge variant="outline" className="ml-2 border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400">
                      Não revisado
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{client.cpf_cnpj ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {client.email ?? client.phone ?? "—"}
                </TableCell>
                {isOwner && (
                  <TableCell className="text-muted-foreground">
                    {(client.assigned_to && memberNames[client.assigned_to]) ?? "—"}
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <ClientFormDialog client={client} isOwner={isOwner} teamMembers={teamMembers} />
                    <ConfirmDeleteButton id={client.id} label="cliente" action={deleteClientRecord} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

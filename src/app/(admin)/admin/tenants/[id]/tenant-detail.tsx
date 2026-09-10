"use client";

import { useActionState, useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminTenantMemberRow, AdminTenantRow } from "@/lib/data/admin";
import { resetMemberPassword, updateMemberProfile, updateTenantName } from "../actions";

const ROLE_LABELS: Record<AdminTenantMemberRow["role"], string> = {
  owner: "Admin da corretora",
  member: "Corretor",
};

export function TenantDetail({
  tenant,
  members,
}: {
  tenant: AdminTenantRow;
  members: AdminTenantMemberRow[];
}) {
  const [nameState, nameAction, namePending] = useActionState(
    updateTenantName.bind(null, tenant.tenant_id),
    { error: null }
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
      <Card>
        <CardHeader>
          <CardTitle>Dados da corretora</CardTitle>
          <CardDescription>Editar o nome altera o que aparece em todo o app dessa corretora.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={nameAction} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da corretora</Label>
              <Input id="name" name="name" defaultValue={tenant.tenant_name} required />
            </div>
            {nameState.error && <p className="text-sm text-destructive">{nameState.error}</p>}
            <Button type="submit" size="sm" disabled={namePending}>
              {namePending ? "Salvando..." : "Salvar"}
            </Button>
          </form>

          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Clientes</dt>
              <dd>{tenant.client_count}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Apólices ativas</dt>
              <dd>{tenant.active_policy_count}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Documentos</dt>
              <dd>{tenant.document_count}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Membros</dt>
              <dd>{tenant.member_count}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membros</CardTitle>
          <CardDescription>Editar nome de exibição ou redefinir a senha de acesso de cada pessoa.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome e e-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhum membro encontrado.
                    </TableCell>
                  </TableRow>
                )}
                {members.map((member) => (
                  <MemberRow key={member.profile_id} tenantId={tenant.tenant_id} member={member} />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MemberRow({ tenantId, member }: { tenantId: string; member: AdminTenantMemberRow }) {
  const [profileState, profileAction, profilePending] = useActionState(
    updateMemberProfile.bind(null, tenantId, member.profile_id),
    { error: null }
  );
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function askReset() {
    setResetError(null);
    setTempPassword(null);
    setResetOpen(true);
  }

  async function confirmReset() {
    setResetPending(true);
    setResetError(null);
    const result = await resetMemberPassword(tenantId, member.profile_id);
    setResetPending(false);
    if (result.error) {
      setResetError(result.error);
    } else {
      setTempPassword(result.password);
    }
  }

  async function handleCopy() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível (ex: contexto não seguro) — usuário copia manualmente
    }
  }

  return (
    <>
      <TableRow>
        <TableCell>
          <form action={profileAction} className="flex flex-col gap-1.5">
            <Input
              name="full_name"
              defaultValue={member.full_name ?? ""}
              className="h-8 w-48"
              placeholder="Nome"
              aria-label={`Nome de ${member.email}`}
            />
            <Input
              name="email"
              type="email"
              defaultValue={member.email}
              className="h-8 w-48"
              placeholder="E-mail"
              aria-label={`E-mail de ${member.email}`}
            />
            <Button type="submit" size="sm" variant="outline" className="w-fit" disabled={profilePending}>
              {profilePending ? "Salvando..." : "Salvar"}
            </Button>
          </form>
          {profileState.error && <p className="mt-1 text-xs text-destructive">{profileState.error}</p>}
        </TableCell>
        <TableCell>
          <Badge variant="outline">{ROLE_LABELS[member.role]}</Badge>
        </TableCell>
        <TableCell>
          <Button variant="ghost" size="icon-sm" title="Redefinir senha" onClick={askReset}>
            <KeyRound className="size-4" />
          </Button>
        </TableCell>
      </TableRow>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          {!tempPassword && !resetError ? (
            <>
              <DialogHeader>
                <DialogTitle>Redefinir senha de {member.email}?</DialogTitle>
                <DialogDescription>
                  A senha atual deixa de funcionar imediatamente. Você vai receber uma senha temporária pra
                  repassar com segurança (WhatsApp, telefone) — não é enviada por e-mail.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setResetOpen(false)} disabled={resetPending}>
                  Cancelar
                </Button>
                <Button onClick={confirmReset} disabled={resetPending}>
                  {resetPending ? "Redefinindo..." : "Confirmar redefinição"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{resetError ? "Erro ao redefinir senha" : "Senha redefinida"}</DialogTitle>
                <DialogDescription>
                  {resetError
                    ? resetError
                    : `Nova senha temporária para ${member.email}. Ela só é exibida agora — copie e repasse com segurança (WhatsApp, telefone) e peça para trocar no próximo login.`}
                </DialogDescription>
              </DialogHeader>
              {tempPassword && (
                <div className="flex items-center gap-2 rounded-md border bg-muted p-3">
                  <code className="flex-1 text-sm break-all">{tempPassword}</code>
                  <Button variant="outline" size="icon-sm" onClick={handleCopy} title="Copiar">
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

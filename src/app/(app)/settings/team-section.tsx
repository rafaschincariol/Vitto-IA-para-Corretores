"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Plus, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { createTeamInvite, removeTeamMember, revokeTeamInvite, type InviteFormState } from "./team-actions";
import { ROLE_LABELS, type Profile, type TenantInvite } from "@/lib/types";

const initialState: InviteFormState = { error: null };

function InviteDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createTeamInvite, initialState);
  const [link, setLink] = useState<string | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (pending) submittedRef.current = true;
    if (!pending && submittedRef.current && !state.error && state.invite) {
      submittedRef.current = false;
      setLink(`${window.location.origin}/signup?invite=${state.invite.token}`);
    }
  }, [pending, state]);

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado.");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setLink(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Convidar
        </Button>
      </DialogTrigger>
      <DialogContent>
        {link ? (
          <>
            <DialogHeader>
              <DialogTitle>Convite criado</DialogTitle>
              <DialogDescription>
                Envie este link para a pessoa. Ele expira quando ela criar a conta.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 py-2">
              <Input readOnly value={link} className="text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={copyLink} aria-label="Copiar link">
                <Copy className="size-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => setOpen(false)}>
                Concluído
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form action={formAction}>
            <DialogHeader>
              <DialogTitle>Convidar para a equipe</DialogTitle>
              <DialogDescription>Gera um link de cadastro para essa pessoa entrar na sua corretora.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite_email">E-mail</Label>
                <Input id="invite_email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite_role">Papel</Label>
                <Select name="role" defaultValue="member" required>
                  <SelectTrigger id="invite_role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Corretor — só vê os clientes atribuídos a ele</SelectItem>
                    <SelectItem value="owner">Admin — vê toda a carteira da corretora</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Gerando..." : "Gerar convite"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function TeamSection({
  members,
  invites,
  currentProfileId,
}: {
  members: Profile[];
  invites: TenantInvite[];
  currentProfileId: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Equipe</h2>
          <p className="text-sm text-muted-foreground">
            Admins veem toda a carteira; Corretores só veem os clientes atribuídos a eles.
          </p>
        </div>
        <InviteDialog />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">
                  {m.full_name ?? "—"}
                  {m.id === currentProfileId && (
                    <span className="ml-1.5 text-xs text-muted-foreground">(você)</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{m.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">{ROLE_LABELS[m.role]}</Badge>
                </TableCell>
                <TableCell>
                  {m.id !== currentProfileId && (
                    <ConfirmDeleteButton id={m.id} label="membro da equipe" action={removeTeamMember} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {invites.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Convites pendentes</p>
          <div className="rounded-md border">
            <Table>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">{invite.email}</TableCell>
                    <TableCell className="text-muted-foreground">{ROLE_LABELS[invite.role]}</TableCell>
                    <TableCell className="text-right">
                      <RevokeInviteButton id={invite.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

function RevokeInviteButton({ id }: { id: string }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Remover convite"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const result = await revokeTeamInvite(id);
        setPending(false);
        if (result.error) toast.error(result.error);
      }}
    >
      <UserMinus className="size-4 text-destructive" />
    </Button>
  );
}

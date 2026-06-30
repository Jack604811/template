"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MoreHorizontalIcon } from "lucide-react";
import { memo, useState } from "react";
import {
  useCancelInvitation,
  useRemoveMember,
  useSuspenseOrganizationInvitations,
  useSuspenseOrganizationMembers,
  useUpdateMemberRole,
} from "../hooks/use-organizations";
import { ASSIGNABLE_ROLES, getRoleLabel, type OrgRole } from "../utils/roles";
import { InviteMemberDialog } from "./invite-member-dialog";

function Avatar({ name }: { name: string }) {
  const initial = name[0]?.toUpperCase() ?? "?";
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
      {initial}
    </span>
  );
}

interface Props {
  organizationId: string;
  currentRole: OrgRole;
  inviteOpen: boolean;
  setInviteOpen: (open: boolean) => void;
}

export const MemberList = memo(({ organizationId, currentRole, inviteOpen, setInviteOpen }: Props) => {
  const { data: members } = useSuspenseOrganizationMembers(organizationId);
  const { data: invitations } = useSuspenseOrganizationInvitations(organizationId);
  const removeMember = useRemoveMember();
  const updateRole = useUpdateMemberRole();
  const cancelInvitation = useCancelInvitation();

  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(null);

  const canManage = currentRole === "owner" || currentRole === "admin";
  const isOwner = currentRole === "owner";

  return (
    <>
      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        organizationId={organizationId}
      />

      <AlertDialog open={!!removeTarget} onOpenChange={(v) => !v && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar miembro</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar a {removeTarget?.name} de la organización?
              Perderá acceso a todos los flujos de trabajo, credenciales y ejecuciones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeTarget) {
                  removeMember.mutate({ organizationId, userId: removeTarget.userId });
                  setRemoveTarget(null);
                }
              }}
              disabled={removeMember.isPending}
            >
              {removeMember.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Usuario</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rol</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Se unió el</th>
              {canManage && <th className="px-4 py-3 w-10" />}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={member.user.name || member.user.email} />
                    <div className="min-w-0">
                      {member.user.name && (
                        <p className="font-medium leading-none truncate">{member.user.name}</p>
                      )}
                      <p className="text-muted-foreground text-xs mt-0.5 truncate">{member.user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm">{getRoleLabel(member.role)}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                  {format(new Date(member.createdAt), "d MMM yyyy", { locale: es })}
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    {member.role !== "owner" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontalIcon className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isOwner && (
                            <>
                              {ASSIGNABLE_ROLES.filter((r) => r !== member.role).map((r) => (
                                <DropdownMenuItem
                                  key={r}
                                  onClick={() => updateRole.mutate({ organizationId, userId: member.user.id, role: r })}
                                >
                                  Cambiar a {getRoleLabel(r)}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setRemoveTarget({ userId: member.user.id, name: member.user.name || member.user.email })}
                          >
                            Eliminar de la organización
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                )}
              </tr>
            ))}

            {invitations.map((inv) => (
              <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors opacity-60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={inv.email} />
                    <p className="text-sm truncate">{inv.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{getRoleLabel(inv.role)}</span>
                    <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-600 dark:text-yellow-400">
                      Pendiente
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                  {format(new Date(inv.createdAt), "d MMM yyyy", { locale: es })}
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => cancelInvitation.mutate({ organizationId, invitationId: inv.id })}
                        >
                          Cancelar invitación
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                )}
              </tr>
            ))}

            {members.length === 0 && invitations.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No hay miembros en esta organización.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
});

MemberList.displayName = "MemberList";

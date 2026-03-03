"use client";

import { memo, useState } from "react";
import { MoreHorizontalIcon, UserIcon, PlusIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CardContent, CardDescription, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { useSuspenseOrganizationMembers, useRemoveMember, useUpdateMemberRole } from "../hooks/use-organizations";
import { InviteMemberDialog } from "./invite-member-dialog";

interface Props {
  organizationId: string;
  currentRole: "owner" | "admin" | "member";
}

export const MemberList = memo(({ organizationId, currentRole }: Props) => {
  const { data: members } = useSuspenseOrganizationMembers(organizationId);
  const removeMember = useRemoveMember();
  const updateRole = useUpdateMemberRole();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ userId: string; name: string } | null>(null);

  const canManageMembers = currentRole === "owner" || currentRole === "admin";
  const isOwner = currentRole === "owner";

  const handleRemoveMember = () => {
    if (selectedMember) {
      removeMember.mutate({
        organizationId,
        userId: selectedMember.userId,
      });
      setRemoveDialogOpen(false);
      setSelectedMember(null);
    }
  };

  const handleChangeRole = (userId: string, newRole: "owner" | "admin" | "member") => {
    updateRole.mutate({
      organizationId,
      userId,
      role: newRole,
    });
  };

  return (
    <>
      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        organizationId={organizationId}
      />

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedMember?.name} from the organization?
              They will lose access to all workflows, credentials, and executions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} disabled={removeMember.isPending}>
              {removeMember.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CardHeader>
        <CardTitle>Team Members</CardTitle>
        <CardDescription>
          Manage who has access to this organization
        </CardDescription>
        {canManageMembers && (
          <CardAction>
            <Button onClick={() => setInviteDialogOpen(true)} size="sm">
              <PlusIcon className="size-4" />
              Add Member
            </Button>
          </CardAction>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium">{member.user.name}</div>
                  <div className="text-sm text-muted-foreground">{member.user.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                  {member.role}
                </Badge>
                {canManageMembers && member.role !== "owner" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontalIcon className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isOwner && (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleChangeRole(member.user.id, "admin")}
                            disabled={member.role === "admin"}
                          >
                            Make Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleChangeRole(member.user.id, "member")}
                            disabled={member.role === "member"}
                          >
                            Make Member
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setSelectedMember({
                            userId: member.user.id,
                            name: member.user.name,
                          });
                          setRemoveDialogOpen(true);
                        }}
                      >
                        Remove from Organization
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </>
  );
});

MemberList.displayName = "MemberList";


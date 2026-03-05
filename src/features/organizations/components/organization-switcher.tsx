"use client";

import { Building2Icon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { memo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { useSuspenseOrganizations, useCurrentOrganization, useSwitchOrganization } from "../hooks/use-organizations";
import { CreateOrganizationDialog } from "./create-organization-dialog";

export const OrganizationSwitcher = memo(() => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: memberships } = useSuspenseOrganizations();
  const { data: currentOrgId } = useCurrentOrganization();
  const switchOrg = useSwitchOrganization();
  
  const currentMembership = memberships.find(m => m.organization.id === currentOrgId);
  const currentOrg = currentMembership?.organization;
  
  return (
    <>
      <CreateOrganizationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton className="gap-x-4 h-10 px-4 justify-start">
            <Building2Icon className="size-4 shrink-0" />
            <span className="flex-1 truncate text-left">
              {currentOrg?.name || "Select Organization"}
            </span>
            <ChevronsUpDownIcon className="size-4 ml-auto shrink-0" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {memberships.map((membership) => (
            <DropdownMenuItem
              key={membership.organization.id}
              onClick={() => switchOrg.mutate({ 
                organizationId: membership.organization.id 
              })}
              disabled={membership.organization.id === currentOrgId}
            >
              <Building2Icon className="size-4 mr-2" />
              <span className="flex-1">{membership.organization.name}</span>
              <span className="text-xs text-muted-foreground">
                {membership.role}
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <PlusIcon className="size-4 mr-2" />
            Create Organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
});

OrganizationSwitcher.displayName = "OrganizationSwitcher";


"use client";

import { Building2Icon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useHasActiveSubscription } from "@/features/subscriptions/hooks/use-subscription";
import { useSwitchOrganization } from "../hooks/use-organizations";
import { CreateOrganizationDialog } from "./create-organization-dialog";

interface Props {
  memberships: Array<{
    id: string;
    role: string;
    organization: {
      id: string;
      name: string;
      slug: string;
      logo: string | null;
    };
  }>;
}

export const SelectOrganizationView = ({ memberships }: Props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const switchOrg = useSwitchOrganization();
  const { hasActiveSubscription } = useHasActiveSubscription();
  const plan = hasActiveSubscription ? "Pro" : "Free";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <CreateOrganizationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Seleccionar negocio</CardTitle>
          <CardDescription>
            Elige un negocio para continuar o crea uno nuevo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {memberships.length > 0 ? (
            <div className="space-y-2">
              {memberships.map((membership) => (
                <Button
                  key={membership.organization.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-4"
                  onClick={() =>
                    switchOrg.mutate(
                      { organizationId: membership.organization.id },
                      { onSuccess: () => { window.location.href = "/chat"; } },
                    )
                  }
                >
                  <Building2Icon className="size-5 mr-3" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">
                      {membership.organization.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {plan}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Building2Icon className="size-12 mx-auto mb-4 opacity-50" />
              <p>Aún no eres miembro de ningún negocio.</p>
              <p className="text-sm mt-1">Crea uno para comenzar.</p>
            </div>
          )}
          <Button
            variant="default"
            className="w-full"
            onClick={() => setDialogOpen(true)}
          >
            <PlusIcon className="size-4 mr-2" />
            Crear nuevo negocio
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};


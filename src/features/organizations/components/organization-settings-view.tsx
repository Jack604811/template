"use client";

import { Building2Icon } from "lucide-react";
import { EntityContainer, EntityHeader } from "@/components/entity-components";
import { MemberList } from "./member-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useCurrentOrganization, useSuspenseOrganizations, useUpdateOrganizationName } from "../hooks/use-organizations";

const formSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
});

type FormValues = z.infer<typeof formSchema>;

export const OrganizationSettingsView = () => {
  const { data: memberships } = useSuspenseOrganizations();
  const { data: currentOrgId } = useCurrentOrganization();
  const updateName = useUpdateOrganizationName();

  const currentMembership = memberships.find(m => m.organization.id === currentOrgId);
  const currentOrg = currentMembership?.organization;
  const currentRole = currentMembership?.role;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: {
      name: currentOrg?.name || "",
    },
  });

  const handleSubmit = (values: FormValues) => {
    if (currentOrgId) {
      updateName.mutate({
        organizationId: currentOrgId,
        name: values.name,
      });
    }
  };

  const canEdit = currentRole === "owner" || currentRole === "admin";

  return (
    <EntityContainer
      header={
        <EntityHeader
          title="Organization Settings"
          description="Manage your organization and team members"
        />
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>
              Update your organization's basic information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={!canEdit || updateName.isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        The name of your organization as shown to team members.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {canEdit && (
                  <Button type="submit" disabled={updateName.isPending}>
                    {updateName.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage who has access to this organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentOrgId && (
              <MemberList organizationId={currentOrgId} currentRole={currentRole || "member"} />
            )}
          </CardContent>
        </Card>
      </div>
    </EntityContainer>
  );
};


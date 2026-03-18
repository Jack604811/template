"use client";

import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { useState } from "react";
import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityItem,
  EntityList,
  EntityPagination,
  EntitySearch,
  ErrorView,
  LoadingView,
} from "@/components/entity-components";
import type { Credential } from "@/generated/prisma";
import { useEntitySearch } from "@/hooks/use-entity-search";
import {
  useRemoveCredential,
  useSuspenseCredentials,
} from "../hooks/use-credentials";
import { useCredentialsParams } from "../hooks/use-credentials-params";
import { AppDirectoryDialog } from "./app-directory";
import { credentialLogos } from "./credential";
import { CredentialConnectionDialog } from "./credential-connection-dialog";
import { TrashIcon, PencilIcon } from "lucide-react";
import type { EntityMenuGroup } from "@/components/entity-components";

export const CredentialsSearch = () => {
  const [params, setParams] = useCredentialsParams();
  const { searchValue, onSearchChange } = useEntitySearch({
    params,
    setParams,
  });

  return (
    <EntitySearch
      value={searchValue}
      onChange={onSearchChange}
      placeholder="Search credentials"
    />
  );
};

export const CredentialsList = () => {
  const credentials = useSuspenseCredentials();

  return (
    <EntityList
      items={credentials.data.items}
      getKey={(credential) => credential.id}
      renderItem={(credential) => <CredentialItem data={credential} />}
      emptyView={<CredentialsEmpty />}
    />
  );
};

export const CredentialsHeader = ({ disabled }: { disabled?: boolean }) => {
  const [appDirectoryOpen, setAppDirectoryOpen] = useState(false);

  return (
    <>
      <EntityHeader
        title="Credentials"
        description="Create and manage your credentials"
        onNew={() => setAppDirectoryOpen(true)}
        newButtonLabel="New credential"
        disabled={disabled}
      />
      <AppDirectoryDialog
        open={appDirectoryOpen}
        onOpenChange={setAppDirectoryOpen}
      />
    </>
  );
};

export const CredentialsPagination = () => {
  const credentials = useSuspenseCredentials();
  const [params, setParams] = useCredentialsParams();

  return (
    <EntityPagination
      disabled={credentials.isFetching}
      totalPages={credentials.data.totalPages}
      page={credentials.data.page}
      onPageChange={(page) => setParams({ ...params, page })}
    />
  );
};

export const CredentialsContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <EntityContainer
      header={<CredentialsHeader />}
      search={<CredentialsSearch />}
      pagination={<CredentialsPagination />}
    >
      {children}
    </EntityContainer>
  );
};

export const CredentialsLoading = () => {
  return <LoadingView message="Loading credentials..." />;
};

export const CredentialsError = () => {
  return <ErrorView message="Error loading credentials" />;
};

export const CredentialsEmpty = () => {
  const [appDirectoryOpen, setAppDirectoryOpen] = useState(false);

  return (
    <>
      <EmptyView
        onNew={() => setAppDirectoryOpen(true)}
        message="You haven't created any credentials yet. Get started by creating your first credential"
      />
      <AppDirectoryDialog
        open={appDirectoryOpen}
        onOpenChange={setAppDirectoryOpen}
      />
    </>
  );
};

export const CredentialItem = ({ data }: { data: Credential }) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const removeCredential = useRemoveCredential();

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  const handleDelete = () => {
    removeCredential.mutate({ id: data.id });
  };

  const logo = credentialLogos[data.type] || "/logos/openai.svg";

  const menuGroups: EntityMenuGroup[] = [
    {
      items: [
        {
          label: "Edit Credential",
          icon: PencilIcon,
          onClick: handleEdit,
        },
      ],
    },
    {
      separator: true,
      items: [
        {
          label: "Delete Credential",
          icon: TrashIcon,
          onClick: handleDelete,
          variant: "destructive",
          disabled: removeCredential.isPending,
        },
      ],
    },
  ];

  return (
    <>
      <EntityItem
        title={data.name}
        subtitle={
          <>
            Updated {formatDistanceToNow(data.updatedAt, { addSuffix: true })}{" "}
            &bull; Created{" "}
            {formatDistanceToNow(data.createdAt, { addSuffix: true })}
          </>
        }
        image={
          <div className="size-8 flex items-center justify-center">
            <Image src={logo} alt={data.type} width={20} height={20} />
          </div>
        }
        menuGroups={menuGroups}
      />
      <CredentialConnectionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        credentialType={data.type}
        existingCredential={{
          id: data.id,
          name: data.name,
        }}
      />
    </>
  );
};

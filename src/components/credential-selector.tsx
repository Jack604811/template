"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { SearchIcon, CheckIcon, PlusIcon } from "lucide-react";
import Image from "next/image";
import { CredentialConnectionDialog } from "@/features/credentials/components/credential-connection-dialog";
import { CredentialType } from "@/generated/prisma";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { cn } from "@/lib/utils";

interface Props {
  value?: string;
  onValueChange: (value: string) => void;
  credentialType: CredentialType;
  logo: string;
  label: string;
  placeholder?: string;
  disabled?: boolean;
}

export const CredentialSelector = ({
  value,
  onValueChange,
  credentialType,
  logo,
  label,
  placeholder = "Select a credential",
  disabled,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: credentials, isLoading, refetch } = useCredentialsByType(credentialType);

  const selectedCredential = credentials?.find((c) => c.id === value);
  const filteredCredentials = credentials?.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCredentialCreated = async (credentialId: string) => {
    await refetch();
    onValueChange(credentialId);
    setOpen(false);
  };

  const handleConnectNew = () => {
    setOpen(false);
    setCreateDialogOpen(true);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-between",
              !selectedCredential && "text-muted-foreground"
            )}
            disabled={disabled || isLoading}
          >
            <div className="flex items-center gap-2">
              {selectedCredential ? (
                <>
                  <Image src={logo} alt={label} width={16} height={16} />
                  <span>{selectedCredential.name}</span>
                </>
              ) : (
                <span>{placeholder}</span>
              )}
            </div>
            {selectedCredential && (
              <CheckIcon className="w-4 h-4 text-primary ml-auto" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="p-3 border-b">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading credentials...
              </div>
            ) : filteredCredentials && filteredCredentials.length > 0 ? (
              filteredCredentials.map((credential) => (
                <button
                  key={credential.id}
                  type="button"
                  onClick={() => {
                    onValueChange(credential.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 text-left hover:bg-accent transition-colors",
                    value === credential.id && "bg-accent"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                    value === credential.id
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  )}>
                    {value === credential.id && (
                      <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                  <Image src={logo} alt={label} width={20} height={20} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {credential.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {credential.type}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchQuery ? "No credentials found" : "No credentials yet"}
              </div>
            )}
          </div>

          <div className="p-3 border-t">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={handleConnectNew}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Connect a new account
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <CredentialConnectionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        credentialType={credentialType}
        onCredentialCreated={handleCredentialCreated}
      />
    </>
  );
};


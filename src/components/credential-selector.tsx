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
import type { CredentialType } from "@/generated/prisma";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { cn } from "@/lib/utils";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";

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
              "w-full justify-between items-center h-auto py-3 px-3",
              !selectedCredential && "text-muted-foreground"
            )}
            disabled={disabled || isLoading}
          >
            {selectedCredential ? (
              <>
                <div className="size-6 flex items-center justify-center shrink-0">
                  <Image src={logo} alt={label} width={20} height={20} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-medium text-sm truncate">
                    {selectedCredential.name}
                  </div>
                  {/* <div className="text-xs text-muted-foreground truncate">
                    {selectedCredential.type}
                  </div> */}
                </div>
                <div className="shrink-0 ml-3">
                  <CheckIcon className="w-4 h-4 text-primary" />
                </div>
              </>
            ) : (
              <span className="text-left">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[462px] p-0" align="start">
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

          <div className="p-3 max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading credentials...
              </div>
            ) : filteredCredentials && filteredCredentials.length > 0 ? (
              <FieldGroup>
                <FieldSet>
                  <RadioGroup
                    value={value}
                    onValueChange={(newValue) => {
                      onValueChange(newValue);
                      setOpen(false);
                    }}
                  >
                    {filteredCredentials.map((credential) => {
                      const credentialId = `credential-${credential.id}`;
                      return (
                        <FieldLabel key={credential.id} htmlFor={credentialId}>
                          <Field orientation="horizontal" className="items-center">
                            <div className="size-6 flex items-center justify-center shrink-0 self-center">
                              <Image src={logo} alt={label} width={20} height={20} />
                            </div>
                            <FieldContent>
                              <FieldTitle>{credential.name}</FieldTitle>
                              {/* <FieldDescription>{credential.type}</FieldDescription> */}
                            </FieldContent>
                            <div className="self-center shrink-0">
                              <RadioGroupItem value={credential.id} id={credentialId} />
                            </div>
                          </Field>
                        </FieldLabel>
                      );
                    })}
                  </RadioGroup>
                </FieldSet>
              </FieldGroup>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchQuery ? "No credentials found" : "No credentials yet"}
              </div>
            )}
          </div>

          <div className="py-2 border-t">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start hover:bg-inerit py-2"
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


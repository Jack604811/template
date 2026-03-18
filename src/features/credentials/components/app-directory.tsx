"use client";

import { SearchIcon } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { CredentialType } from "@/generated/prisma";
import { cn } from "@/lib/utils";
import { credentialTypeOptions, searchCredentialOptions } from "./credential";
import { CredentialConnectionDialog } from "./credential-connection-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AppDirectoryDialog = ({ open, onOpenChange }: Props) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<CredentialType | null>(null);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);

  const filteredApps = useMemo(() => {
    return searchQuery
      ? searchCredentialOptions(searchQuery)
      : [...credentialTypeOptions];
  }, [searchQuery]);

  const handleSelectApp = (appType: CredentialType) => {
    setSelectedApp(appType);
    setConnectionDialogOpen(true);
    onOpenChange(false);
  };

  const handleConnectionDialogClose = (isOpen: boolean) => {
    setConnectionDialogOpen(isOpen);
    if (!isOpen) {
      setSelectedApp(null);
      setSearchQuery("");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>Connect an App</DialogTitle>
            <DialogDescription>
              Choose an app to connect and use in your workflows
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto px-2 pb-2">
            {filteredApps.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No apps found. Try adjusting your search.
              </div>
            ) : (
              <div className="space-y-1">
                {filteredApps.map((app) => (
                  <button
                    key={app.value}
                    type="button"
                    onClick={() => handleSelectApp(app.value)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg",
                      "hover:bg-accent transition-colors text-left",
                    )}
                  >
                    <div className="size-10 flex items-center justify-center rounded-lg border bg-background">
                      <Image
                        src={app.logo}
                        alt={app.label}
                        width={24}
                        height={24}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{app.label}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {app.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {selectedApp && (
        <CredentialConnectionDialog
          open={connectionDialogOpen}
          onOpenChange={handleConnectionDialogClose}
          credentialType={selectedApp}
        />
      )}
    </>
  );
};

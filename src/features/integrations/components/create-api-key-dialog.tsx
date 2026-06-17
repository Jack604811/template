"use client";

import { CopyIcon, EyeIcon, EyeOffIcon, InfoIcon, KeyRoundIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Phase = "create" | "view";

export function CreateApiKeyDialog({ open, onOpenChange }: CreateApiKeyDialogProps) {
  const [phase, setPhase] = useState<Phase>("create");
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreate = () => {
    const key = `nb_${Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;
    setApiKey(key);
    setPhase("view");
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setTimeout(() => {
        setPhase("create");
        setName("");
        setApiKey("");
        setRevealed(false);
        setCopied(false);
      }, 200);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent title={phase === "create" ? "Crear API Key" : "Ver API Key"} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{phase === "create" ? "Crear API Key" : "Ver API Key"}</DialogTitle>
        </DialogHeader>

        {phase === "create" ? (
          <>
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="key-name" className="text-[14px] font-semibold">
                  Nombre de la key
                </Label>
                <Input
                  id="key-name"
                  placeholder="e.g., Producción API Key"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && name.trim() && handleCreate()}
                  autoFocus
                />
                <p className="text-[13px] text-muted-foreground">
                  Dale un nombre descriptivo para identificarla más adelante.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={!name.trim()}>
                <KeyRoundIcon className="size-4" />
                Crear Key
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-3 dark:border-blue-900/50 dark:bg-blue-950/30">
              <InfoIcon className="size-4 mt-0.5 shrink-0 text-blue-500" />
              <p className="text-[13px] text-blue-700 dark:text-blue-400 leading-snug">
                Solo puedes ver esta key una vez. Guárdala en un lugar seguro.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-[14px] font-semibold">API Key</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    readOnly
                    value={revealed ? apiKey : "•".repeat(40)}
                    className="pr-10 font-mono text-[13px] tracking-wider"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setRevealed((r) => !r)}
                  className="shrink-0"
                >
                  {revealed ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  <CopyIcon className="size-4" />
                  <span className="sr-only">{copied ? "Copiado" : "Copiar"}</span>
                </Button>
              </div>
              {copied && (
                <p className="text-[12px] text-emerald-600 dark:text-emerald-400">¡Copiado al portapapeles!</p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Listo
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

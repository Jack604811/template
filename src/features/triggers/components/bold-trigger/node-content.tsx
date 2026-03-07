"use client";

import { CopyIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkflowStore } from "@/features/editor/store/workflow-store";
import { useUpdateWorkflow } from "@/features/workflows/hooks/use-workflows";
import { checkBoldIdUnique } from "./actions";

interface BoldNodeContentProps {
  nodeId: string;
}

type BoldTriggerNodeData = {
  boldId?: string;
};

export function BoldTriggerNodeContent({ nodeId }: BoldNodeContentProps) {
  const setNodes = useWorkflowStore((s) => s.setNodes);
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === nodeId));
  const params = useParams<{ workflowId: string }>();
  const workflowId = params?.workflowId;
  const saveWorkflow = useUpdateWorkflow();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentBoldId = (node?.data as BoldTriggerNodeData)?.boldId ?? "";
  const [customPath, setCustomPath] = useState(currentBoldId || nodeId);
  const [boldIdError, setBoldIdError] = useState<string | null>(null);

  // On first mount, if boldId was never set, initialize it to nodeId so the
  // displayed URL matches what the webhook route will find in the database.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      if (!currentBoldId && workflowId) {
        const nodes = useWorkflowStore.getState().nodes;
        setNodes(
          nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, boldId: nodeId } } : n,
          ),
        );
        saveWorkflow.mutate({
          id: workflowId,
          nodes: useWorkflowStore.getState().nodes,
          edges: useWorkflowStore.getState().edges,
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentBoldId) setCustomPath(currentBoldId);
  }, [currentBoldId]);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const webhookUrl = `${baseUrl}/api/bold/${customPath}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success("URL del webhook copiada al portapapeles");
    } catch {
      toast.error("No se pudo copiar la URL");
    }
  };

  const handlePathChange = (value: string) => {
    setCustomPath(value);
    setBoldIdError(null);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    if (!workflowId) return;

    saveTimeoutRef.current = setTimeout(async () => {
      const isUnique = await checkBoldIdUnique(value, nodeId);

      if (!isUnique) {
        setBoldIdError("Esta URL ya está en uso por otro nodo Bold");
        saveTimeoutRef.current = null;
        return;
      }

      const nodes = useWorkflowStore.getState().nodes;
      setNodes(
        nodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, boldId: value } } : n,
        ),
      );

      const { nodes: currentNodes, edges } = useWorkflowStore.getState();
      saveWorkflow.mutate({ id: workflowId, nodes: currentNodes, edges });
      saveTimeoutRef.current = null;
    }, 500);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bold-webhook-url">URL del Webhook</Label>
        <div className="flex min-w-0 gap-2">
          <div className={`nodrag flex min-w-0 cursor-text flex-1 flex-nowrap items-center gap-0 overflow-x-auto rounded-md border bg-background font-mono text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${boldIdError ? "border-destructive" : "border-input"}`}>
            <span className="shrink-0 whitespace-nowrap py-2 pl-3 text-sm">
              {baseUrl}/api/bold/
            </span>
            <Input
              id="bold-webhook-url"
              value={customPath}
              onChange={(e) => handlePathChange(e.target.value)}
              className="nodrag cursor-text min-w-0 shrink border-0 bg-transparent px-0 py-2 pr-3 font-mono text-sm whitespace-nowrap focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="nodrag shrink-0"
            onClick={copyToClipboard}
            disabled={!!boldIdError}
          >
            <CopyIcon className="size-4" />
          </Button>
        </div>
        {boldIdError && (
          <p className="text-xs text-destructive">{boldIdError}</p>
        )}
      </div>

      <div className="space-y-2 rounded-lg bg-muted p-3">
        <h4 className="text-sm font-medium">Instrucciones</h4>
        <ol className="space-y-1 text-xs text-muted-foreground list-decimal list-inside">
          <li>
            Abre el{" "}
            <a
              href="https://panel.bold.co/misventas/integraciones/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="nodrag underline hover:text-foreground"
            >
              Panel de Comercios de Bold
            </a>
          </li>
          <li>Haz clic en Configurar webhook</li>
          <li>Pega la URL del webhook y guarda</li>
        </ol>
      </div>

      <div className="space-y-2 rounded-lg bg-muted p-3">
        <h4 className="text-sm font-medium">Variables disponibles</h4>
        <div className="flex flex-wrap gap-1.5">
          {[
            "Tipo de evento",
            "Monto total",
            "Moneda",
            "Método de pago",
            "Correo del pagador",
            "Referencia de pago",
            "ID del pago",
            "Datos completos",
          ].map((label) => (
            <span
              key={label}
              className="rounded-md bg-background border px-2 py-0.5 text-xs text-muted-foreground"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

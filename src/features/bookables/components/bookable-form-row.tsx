import { CircleHelpIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const iconCls = "size-[15px] text-primary/70";

export const inputCls =
  "w-full bg-transparent border-none outline-none text-[15px] text-foreground leading-snug p-0 m-0 font-[inherit] appearance-none placeholder:text-muted-foreground/40";

export const numberInputCls =
  "bg-transparent border-none outline-none text-[15px] text-foreground leading-snug p-0 m-0 font-[inherit] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export const selectTriggerCls =
  "h-auto border-0 bg-transparent p-0 text-[15px] leading-snug shadow-none focus:ring-0 focus:ring-offset-0";

export function FormRow({
  icon,
  label,
  tooltip,
  last = false,
  error,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  tooltip?: string;
  last?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-start gap-4 py-3.5 px-5", !last && "border-b border-border/40")}>
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-muted/30">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-1.5">
          <p className="text-[11px] font-semibold uppercase leading-none tracking-wider text-muted-foreground">
            {label}
          </p>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="shrink-0 text-muted-foreground/40 transition-colors hover:text-muted-foreground">
                  <CircleHelpIcon className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-56">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {children}
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

export function SwitchRow({
  icon,
  label,
  tooltip,
  last = false,
  checked,
  onCheckedChange,
}: {
  icon: React.ReactNode;
  label: string;
  tooltip?: string;
  last?: boolean;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className={cn("flex items-center gap-4 py-3.5 px-5", !last && "border-b border-border/40")}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-muted/30">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[15px] leading-snug text-foreground">{label}</p>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="shrink-0 text-muted-foreground/40 transition-colors hover:text-muted-foreground">
                  <CircleHelpIcon className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-56">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} className="shrink-0" />
    </div>
  );
}

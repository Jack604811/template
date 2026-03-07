import { forwardRef } from "react";
import { Handle, Position, useHandleConnections, type HandleProps } from "@xyflow/react";

import { cn } from "@/lib/utils";

export type BaseHandleProps = HandleProps & { label?: string };

function BaseHandleInner({ className, style, label, children, innerRef, ...props }: BaseHandleProps & { innerRef?: React.Ref<HTMLDivElement> }) {
  const isLeft = props.position === Position.Left;
  const connections = useHandleConnections({ type: props.type, id: props.id ?? undefined });
  const isConnected = connections.length > 0;

  const positionStyle =
    props.position === Position.Right
      ? { top: "auto", bottom: 6, transform: "translateY(0) translateX(-70%)" }
      : { bottom: "auto", top: "24", transform: "translateY(0) translateX(-50%)" };

  return (
    <Handle
      ref={innerRef}
      {...props}
      className={cn(
        "!h-3 !w-3 !rounded-full !border-2 !border-muted-foreground/50 hover:!border-primary",
        isConnected ? "!bg-muted-foreground/20 border" : "!bg-transparent",
        isLeft && "!opacity-0 !pointer-events-none",
        className,
      )}
      style={{ ...positionStyle, ...style }}
    >
      {label && (
        <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] text-muted-foreground select-none pointer-events-none">
          {label}
        </span>
      )}
      {children}
    </Handle>
  );
}

export const BaseHandle = forwardRef<HTMLDivElement, BaseHandleProps>(
  (props, ref) => <BaseHandleInner {...props} innerRef={ref} />,
);

BaseHandle.displayName = "BaseHandle";

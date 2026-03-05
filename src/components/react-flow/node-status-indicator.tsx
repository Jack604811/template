import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { BorderBeam } from "@/components/ui/border-beam";

export type NodeStatus = "loading" | "success" | "error" | "initial";

export type NodeStatusVariant = "overlay" | "border";

export type NodeStatusIndicatorProps = {
  status?: NodeStatus;
  variant?: NodeStatusVariant;
  children: ReactNode;
  className?: string;
};

// export const SpinnerLoadingIndicator = ({
//   children,
// }: {
//   children: ReactNode;
// }) => {
//   return (
//     <div className="relative w-full h-full">
//       <StatusBorder className="border-blue-700/40">{children}</StatusBorder>

//       <div className="absolute inset-0 z-50 rounded-[7px] bg-background/50 backdrop-blur-sm" />
//       <div className="absolute inset-0 z-50">
//         <span className="absolute left-[calc(50%-1.25rem)] top-[calc(50%-1.25rem)] inline-block h-10 w-10 animate-ping rounded-full bg-blue-700/20" />

//         {/* <LoaderCircle className="absolute left-[calc(50%-0.75rem)] top-[calc(50%-0.75rem)] size-6 animate-spin text-blue-700" /> */}
//       </div>
//     </div>
//   );
// };

export const BorderLoadingIndicator = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute -left-[2px] -top-[2px] h-[calc(100%+4px)] w-[calc(100%+4px)] overflow-hidden rounded-xl">
        <BorderBeam duration={2000} rx="30%" ry="30%">
          <div className="h-128 w-128 bg-[radial-gradient(ellipse_at_center,_rgba(42,67,233,0.8)_0%,_rgba(42,138,246,0.4)_50%,_transparent_70%)] opacity-90" />
        </BorderBeam>
      </div>
      {children}
    </div>
  );
};

const StatusBorder = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <>
      <div
        className={cn(
          "absolute -left-[2px] -top-[2px] h-[calc(100%+4px)] w-[calc(100%+4px)] rounded-xl border-3",
          className,
        )}
      />
      {children}
    </>
  );
};

export const NodeStatusIndicator = ({
  status,
  variant: _variant,
  children,
  className,
}: NodeStatusIndicatorProps) => {
  switch (status) {
    case "loading":
      return <BorderLoadingIndicator className={className}>{children}</BorderLoadingIndicator>;
    case "success":
      return (
        <StatusBorder className={cn("border-green-700/50", className)}>{children}</StatusBorder>
      );
    case "error":
      return <StatusBorder className={cn("border-red-700/50", className)}>{children}</StatusBorder>;
    default:
      return <>{children}</>;
  }
};

"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ChevronLeftIcon, XIcon } from "lucide-react";
import * as React from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type PopoverContextValue = { isMobile: boolean };
const PopoverContext = React.createContext<PopoverContextValue>({
  isMobile: false,
});

function Popover({
  open,
  onOpenChange,
  modal,
  defaultOpen,
  children,
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <PopoverContext.Provider value={{ isMobile: true }}>
        <Drawer
          open={open}
          onOpenChange={onOpenChange}
          modal={modal}
          defaultOpen={defaultOpen}
        >
          {children}
        </Drawer>
      </PopoverContext.Provider>
    );
  }

  return (
    <PopoverContext.Provider value={{ isMobile: false }}>
      <PopoverPrimitive.Root
        data-slot="popover"
        open={open}
        onOpenChange={onOpenChange}
        modal={modal}
        defaultOpen={defaultOpen}
      >
        {children}
      </PopoverPrimitive.Root>
    </PopoverContext.Provider>
  );
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  const { isMobile } = React.useContext(PopoverContext);

  if (isMobile) {
    return <DrawerTrigger data-slot="popover-trigger" {...props} />;
  }

  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  title,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  title?: string;
}) {
  const { isMobile } = React.useContext(PopoverContext);

  if (isMobile) {
    return (
      <DrawerContent data-slot="popover-content">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <DrawerClose asChild>
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
            >
              <ChevronLeftIcon className="size-5" />
            </button>
          </DrawerClose>
          {title ? (
            <DrawerTitle className="text-[15px] font-semibold">
              {title}
            </DrawerTitle>
          ) : (
            <DrawerTitle className="sr-only">Options</DrawerTitle>
          )}
          <DrawerClose asChild>
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
            >
              <XIcon className="size-5" />
            </button>
          </DrawerClose>
        </div>
        <div
          className="overflow-y-auto pb-safe-or-6 px-6 [&_.rdp-root]:w-full"
          style={
            {
              "--cell-size": "calc((100vw - 4.5rem) / 7)",
            } as React.CSSProperties
          }
        >
          {children}
        </div>
      </DrawerContent>
    );
  }

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden",
          className,
        )}
        {...props}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };

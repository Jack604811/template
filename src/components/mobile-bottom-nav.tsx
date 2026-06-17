"use client";

import { CalendarDaysIcon, HomeIcon, MessageCircleIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { title: "Home", icon: HomeIcon, url: "/" },
  { title: "Reservas", icon: CalendarDaysIcon, url: "/bookings" },
  { title: "Chat", icon: MessageCircleIcon, url: "/chat" },
  { title: "Ajustes", icon: SettingsIcon, url: "/settings" },
];

const MAIN_PATHS = new Set(["/", "/bookings", "/chat", "/settings"]);

export function MobileBottomNav() {
  const pathname = usePathname();

  if (!MAIN_PATHS.has(pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-around safe-area-inset-bottom">
        {TABS.map(({ title, icon: Icon, url }) => {
          const isActive = pathname === url;
          return (
            <Link
              key={url}
              href={url}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground/60",
              )}
            >
              <div className={cn(
                "flex size-8 items-center justify-center rounded-xl transition-colors",
                isActive && "bg-foreground/8",
              )}>
                <Icon className={cn("size-5", isActive && "stroke-[2.2px]")} />
              </div>
              <span className={cn(
                "text-[10px] font-medium leading-none",
                isActive ? "text-foreground" : "text-muted-foreground/60",
              )}>
                {title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

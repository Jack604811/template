"use client";

import { CalendarDaysIcon, FolderOpenIcon, HomeIcon, MessageCircleIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  { title: "Home", icon: HomeIcon, url: "/" },
  { title: "Reservas", icon: CalendarDaysIcon, url: "/bookings" },
  { title: "Chat", icon: MessageCircleIcon, url: "/chat" },
  { title: "Services", icon: FolderOpenIcon, url: "/services" },
  { title: "Ajustes", icon: SettingsIcon, url: "/settings" },
];

const MAIN_PATHS = new Set(["/", "/bookings", "/chat", "/services", "/settings"]);

function MobileBottomNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!MAIN_PATHS.has(pathname)) return null;
  if (pathname === "/chat" && searchParams.get("id")) return null;

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 md:hidden flex justify-center px-4">
      <nav className="flex items-center gap-1 rounded-full border border-white/10 bg-neutral-950 p-2 shadow-lg">
        {TABS.map(({ title, icon: Icon, url }) => {
          const isActive = pathname === url;
          return (
            <Link
              key={url}
              href={url}
              className={cn(
                "flex flex-col items-center gap-1 rounded-full px-3 py-2 transition-colors",
                isActive ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80",
              )}
            >
              <Icon className="size-5" />
              <span className="text-[10px] font-medium leading-none">{title}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function MobileBottomNav() {
  return (
    <Suspense>
      <MobileBottomNavInner />
    </Suspense>
  );
}

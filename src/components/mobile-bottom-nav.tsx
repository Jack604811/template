"use client";

import { CalendarDots, ChatCircle, Database, Gear, House } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const TABS = [
  { title: "Home",     icon: House,         url: "/",         color: "#3A86FF" },
  { title: "Reservas", icon: CalendarDots,  url: "/bookings", color: "#FF7B54" },
  { title: "Chat",     icon: ChatCircle,    url: "/chat",     color: "#06D6A0" },
  { title: "CMS",      icon: Database,       url: "/cms",      color: "#FF5C8A" },
  { title: "Ajustes",  icon: Gear,          url: "/settings", color: "#B388FF" },
];

const MAIN_PATHS = new Set(["/", "/bookings", "/chat", "/cms", "/settings"]);

function MobileBottomNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!MAIN_PATHS.has(pathname)) return null;
  if (pathname === "/chat" && searchParams.get("id")) return null;

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 md:hidden">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
        className="relative isolate flex w-[min(380px,calc(100vw-2rem))] items-center justify-around rounded-full px-5 py-2.5"
        style={{
          background: "rgba(18,18,18,0.72)",
          border: "1px solid rgba(255,255,255,0.11)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 z-[-1] rounded-full"
          style={{ backdropFilter: "blur(2px) saturate(1.6)", WebkitBackdropFilter: "blur(2px) saturate(1.6)" }}
        />

        {TABS.map((tab, i) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.url;

          return (
            <Link
              key={tab.url}
              href={tab.url}
              className="relative flex flex-col items-center gap-[3px] px-3 py-1"
            >
              {isActive && (
                <motion.div
                  layoutId="tab-glow"
                  className={`absolute -inset-y-1 rounded-full ${
                    i === 0
                      ? "-left-5 -right-3"
                      : i === TABS.length - 1
                        ? "-left-3 -right-5"
                        : "-inset-x-3"
                  }`}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}

              <div
                className="relative z-10 flex flex-col items-center gap-px"
                style={{
                  transform:
                    i === 0
                      ? "translateX(-4px)"
                      : i === TABS.length - 1
                        ? "translateX(4px)"
                        : undefined,
                }}
              >
                <motion.div
                  animate={{ scale: isActive ? 1.15 : 1, y: isActive ? -1 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Icon
                    size={20}
                    weight="regular"
                    style={{
                      color: isActive ? "#ffffff" : "rgba(255,255,255,0.45)",
                      transition: "color 0.2s ease",
                    }}
                  />
                </motion.div>

                <span
                  className="text-[10px] font-medium leading-none"
                  style={{
                    color: isActive ? "#ffffff" : "rgba(255,255,255,0.45)",
                    transition: "color 0.2s ease",
                  }}
                >
                  {tab.title}
                </span>
              </div>
            </Link>
          );
        })}
      </motion.div>
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

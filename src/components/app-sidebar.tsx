"use client";

import {
  BotIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  DatabaseIcon,
  HomeIcon,
  LogOutIcon,
  MessageCircleIcon,
  PlugZapIcon,
  SettingsIcon,
  StarIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { OrganizationSwitcher } from "@/features/organizations/components/organization-switcher";
import { useHasActiveSubscription } from "@/features/subscriptions/hooks/use-subscription";
import { useNavigationHistory } from "@/hooks/use-navigation-history";
import { authClient } from "@/lib/auth-client";

const isDev = process.env.NODE_ENV === "development";

const menuItems = [
  {
    title: "Main",
    items: [
      { title: "Home", icon: HomeIcon, url: "/" },
      ...(isDev ? [{ title: "Reservas", icon: CalendarDaysIcon, url: "/bookings" }] : []),
      { title: "Chats", icon: MessageCircleIcon, url: "/chat" },
      ...(isDev ? [{ title: "Agentes", icon: BotIcon, url: "/agents" }] : []),
      ...(isDev ? [{ title: "CMS", icon: DatabaseIcon, url: "/cms" }] : []),
      { title: "Integraciones", icon: PlugZapIcon, url: "/integrations" },
      { title: "Settings", icon: SettingsIcon, url: "/settings" },
    ],
  },
];

export const AppSidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hasActiveSubscription, isLoading } = useHasActiveSubscription();
  const { saveCurrentRoute, getLastVisited, getBaseRoute, resetRouteHistory } =
    useNavigationHistory();

  useEffect(() => {
    saveCurrentRoute(searchParams.toString());
  }, [saveCurrentRoute, searchParams]);

  const handleSidebarClick = useCallback(
    (baseUrl: string, e: React.MouseEvent<HTMLAnchorElement>) => {
      const currentBaseRoute = getBaseRoute(pathname);

      if (pathname !== baseUrl && currentBaseRoute === baseUrl) {
        e.preventDefault();
        resetRouteHistory(baseUrl);
        router.push(baseUrl);
        return;
      }

      if (currentBaseRoute !== baseUrl) {
        const lastVisited = getLastVisited(baseUrl);
        if (lastVisited && lastVisited !== baseUrl) {
          e.preventDefault();
          router.push(lastVisited);
        }
      }
    },
    [pathname, getBaseRoute, getLastVisited, resetRouteHistory, router],
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="py-2">
            <Suspense fallback={<div className="h-10" />}>
              <OrganizationSwitcher />
            </Suspense>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {menuItems.map((group) => (
          <SidebarGroup key={group.title} className="py-8">
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={
                        item.url === "/"
                          ? pathname === "/"
                          : pathname.startsWith(item.url)
                      }
                      asChild
                      className="h-10 justify-start gap-x-4 px-4"
                    >
                      <Link
                        href={item.url}
                        prefetch
                        className="flex w-full items-center gap-x-4"
                        onClick={(e) => handleSidebarClick(item.url, e)}
                      >
                        <item.icon className="size-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {!hasActiveSubscription && !isLoading && (
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Upgrade to Pro"
                className="h-10 justify-start gap-x-4 px-4"
                onClick={() => authClient.checkout({ slug: "pro" })}
              >
                <StarIcon className="size-4 shrink-0" />
                <span className="truncate">Upgrade to Pro</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Billing Portal"
              className="h-10 justify-start gap-x-4 px-4"
              onClick={() => authClient.customer.portal()}
            >
              <CreditCardIcon className="size-4 shrink-0" />
              <span className="truncate">Billing Portal</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign out"
              className="h-10 justify-start gap-x-4 px-4"
              onClick={() =>
                authClient.signOut({
                  fetchOptions: { onSuccess: () => router.push("/login") },
                })
              }
            >
              <LogOutIcon className="size-4 shrink-0" />
              <span className="truncate">Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

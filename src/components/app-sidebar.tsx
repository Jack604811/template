"use client";

import { Suspense, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarIcon,
  CreditCardIcon,
  FolderOpenIcon,
  HistoryIcon,
  HomeIcon,
  ListIcon,
  LogOutIcon,
  MessageCircleIcon,
  SettingsIcon,
  ShoppingCartIcon,
  StarIcon,
  TagsIcon,
  UsersIcon,
  WorkflowIcon,
} from "lucide-react";
import { useNavigationHistory } from "@/hooks/use-navigation-history";
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
import { authClient } from "@/lib/auth-client";
import { useHasActiveSubscription } from "@/features/subscriptions/hooks/use-subscription";
import { OrganizationSwitcher } from "@/features/organizations/components/organization-switcher";


const menuItems = [
  {
    title: "Main",
    items: [
      {
        title: "Home",
        icon: HomeIcon,
        url: "/chat",
      },
      {
        title: "Calendar",
        icon: CalendarIcon,
        url: "/calendar",
      },
      {
        title: "Catalog",
        icon: FolderOpenIcon,
        url: "/catalog",
      },
      {
        title: "Upsells",
        icon: TagsIcon,
        url: "/upsells",
      },
      {
        title: "Workflows",
        icon: WorkflowIcon,
        url: "/workflows",
      },
      // {
      //   title: "Integrations",
      //   icon: KeyIcon,
      //   url: "/credentials",
      // },
      // {
      //   title: "Executions",
      //   icon: HistoryIcon,
      //   url: "/executions",
      // },
      {
        title: "Settings",
        icon: SettingsIcon,
        url: "/settings",
      },
    ],
  }
];

export const AppSidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { hasActiveSubscription, isLoading } = useHasActiveSubscription();
  const { saveCurrentRoute, getLastVisited, getBaseRoute, resetRouteHistory } = useNavigationHistory();

  // Save current route whenever pathname changes
  useEffect(() => {
    saveCurrentRoute();
  }, [pathname, saveCurrentRoute]);

  const handleSidebarClick = useCallback((baseUrl: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    const currentBaseRoute = getBaseRoute(pathname);
    
    // If clicking on the same section's sidebar item while on a detail page, reset and go to base
    // Check: we're on a detail page (pathname !== baseUrl) and it's the same section (currentBaseRoute === baseUrl)
    if (pathname !== baseUrl && currentBaseRoute === baseUrl) {
      e.preventDefault();
      resetRouteHistory(baseUrl);
      router.push(baseUrl);
      return;
    }
    
    // Only check last visited if we're NOT already in this section
    if (currentBaseRoute !== baseUrl) {
      const lastVisited = getLastVisited(baseUrl);
      
      // If there's a last visited sub-route, navigate there instead
      if (lastVisited && lastVisited !== baseUrl) {
        e.preventDefault();
        router.push(lastVisited);
      }
    }
  }, [pathname, getBaseRoute, getLastVisited, resetRouteHistory, router]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          {/* <SidebarMenuItem>
            <SidebarMenuButton asChild className="gap-x-2 h-10 px-4">
              <Link href="/" prefetch>
                <Image src="/logos/logo.svg" alt="Flik" width={30} height={30} />
                <span className="font-semibold text-lg">Flik</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem> */}
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
                      className="gap-x-4 h-10 px-4 justify-start"
                    >
                      <Link 
                        href={item.url} 
                        prefetch 
                        className="flex items-center gap-x-4 w-full"
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
                className="gap-x-4 h-10 px-4 justify-start"
                onClick={() => authClient.checkout({ slug: "pro" })}
              >
                <StarIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">Upgrade to Pro</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Billing Portal"
              className="gap-x-4 h-10 px-4 justify-start"
              onClick={() => authClient.customer.portal()}
            >
              <CreditCardIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">Billing Portal</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign out"
              className="gap-x-4 h-10 px-4 justify-start"
              onClick={() => authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push("/login");
                  },
                },
              })}
            >
              <LogOutIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { LayoutPullToRefresh } from "@/components/pull-to-refresh";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  if (!session.session.activeOrganizationId) {
    redirect("/select-organization");
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset className="bg-accent/20">
        <LayoutPullToRefresh>
          {children}
        </LayoutPullToRefresh>
      </SidebarInset>
      <MobileBottomNav />
    </SidebarProvider>
  );
};

export default Layout;

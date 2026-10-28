import { Link, useRouterState } from "@tanstack/react-router";
import { UserRound, ClipboardList, BarChart3, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { agencyApiRequest, clearAgencyToken, getAgency } from "@/lib/agency-api";

const items = [
  { title: "New Entry", url: "/agency-portal", icon: UserRound },
  { title: "My Entries", url: "/agency-portal-entries", icon: ClipboardList },
  { title: "Reports", url: "/agency-portal-reports", icon: BarChart3 },
];

export function AgencySidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const agency = getAgency();

  const handleLogout = async () => {
    try {
      await agencyApiRequest("/agency/logout", { method: "POST" });
    } catch {
      // Ignore — clearing the local token below ends the session either way.
    }
    clearAgencyToken();
    window.location.href = "/login";
  };

  return (
    <Sidebar collapsible="icon" className="no-print">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-14 w-14 place-items-center rounded-lg bg-transparent overflow-hidden flex-shrink-0">
            <img src="/assets/images/best-logo.png" alt="Logo" className="h-full w-full object-contain" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 pr-1">
              <span className="font-display text-sm font-semibold text-sidebar-foreground leading-tight break-words block">
                Agency Portal
              </span>
              <span className="text-[11px] text-sidebar-foreground/60 leading-tight break-words block">
                {agency?.name}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Agency</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign out" onClick={handleLogout}>
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed && (
          <div className="px-3.5 py-3 text-[9px] text-sidebar-foreground/50 border-t border-sidebar-border/20 mt-1 leading-normal select-none">
            <p className="font-medium">© {new Date().getFullYear()} BEST Health Diagnostic Ltd.</p>
            <p>All Rights Reserved.</p>
            <p className="font-semibold text-sidebar-foreground/75 mt-1">Developed by Nexovia IT Limited</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

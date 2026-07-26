import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Database,
  FileText,
  ClipboardList,
  ScanLine,
  Users,
  Building2,
  Globe2,
  UserCog,
  Wallet,
  KeyRound,
  LogOut,
  Stethoscope,
  Search,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
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

import { clearToken, apiRequest } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const primary = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
  { title: "Database", url: "/database", icon: Database },
  { title: "Entry Form", url: "/entry-form", icon: FileText },
  { title: "Report Entry", url: "/report-entry", icon: ClipboardList },
  { title: "Malaysia Report", url: "/malaysia-report", icon: Stethoscope },
  { title: "X-Ray Upload", url: "/xray", icon: ScanLine },
  { title: "Check Report", url: "/medical", icon: Search },
];

const management = [
  { title: "MR List", url: "/mr-list", icon: Users },
  { title: "Agency List", url: "/agency-list", icon: Building2 },
  { title: "Country List", url: "/country-list", icon: Globe2 },
  { title: "Agency Balance", url: "/agency-balance", icon: Wallet },
];

const account = [
  { title: "Admin Report", url: "/admin-report", icon: BarChart3 },
  { title: "Site Settings", url: "/acc-info", icon: UserCog },
  { title: "Password", url: "/password", icon: KeyRound },
  { title: "Users", url: "/users", icon: Users },
  { title: "Roles & Permissions", url: "/roles", icon: ShieldCheck },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const { data: user } = useQuery<any>({
    queryKey: ["currentUserProfile"],
    queryFn: () => apiRequest("/auth/me"),
    enabled: typeof window !== "undefined" && !!localStorage.getItem("mediadmin_token"),
  });

  const { data: settings } = useQuery<any>({
    queryKey: ["public-settings"],
    queryFn: () => apiRequest("/public/site-settings"),
  });

  const logoSrc = settings?.logo_path || "/assets/images/best-logo.png";
  const companyName = settings?.company_name_en || "Best Health";


  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));

  const handleLogout = async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    }
    clearToken();
    window.location.href = "/login";
  };

  const renderGroup = (label: string, items: typeof primary) => {
    // Filter items based on user permissions
    const filteredItems = items.filter(item => {
      // Superadmin or explicit Admin role bypasses these checks
      if (user?.role === 'Admin' || user?.role_name === 'Superadmin') return true;
      
      const perms = user?.permissions || [];
      
      // Map URLs to required permissions
      if (item.url === '/') return perms.includes('view_dashboard');
      if (item.url === '/database') return perms.includes('view_database');
      if (item.url === '/entry-form') return perms.includes('add_patient');
      if (item.url === '/report-entry') return perms.includes('edit_report');
      if (item.url === '/malaysia-report') return perms.includes('edit_report');
      if (item.url === '/xray') return perms.includes('upload_xray');
      if (item.url === '/medical') return perms.includes('view_database'); // Check report usually tied to database view
      if (item.url === '/mr-list') return perms.includes('view_mr_list');
      if (item.url === '/agency-list') return perms.includes('view_agency_list');
      if (item.url === '/country-list') return perms.includes('view_country_list');
      if (item.url === '/agency-balance') return perms.includes('view_agency_balance');
      if (item.url === '/users') return perms.includes('manage_users');
      if (item.url === '/roles') return perms.includes('manage_roles');
      if (item.url === '/acc-info') return perms.includes('manage_settings');
      if (item.url === '/admin-report') return perms.includes('view_reports');
      if (item.url === '/password') return true; // Everyone can change their password

      return false; // Hide by default if not matched
    });

    if (filteredItems.length === 0) return null;

    return (
      <SidebarGroup>
        {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
        <SidebarGroupContent>
          <SidebarMenu>
            {filteredItems.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
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
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-14 w-14 place-items-center rounded-lg bg-transparent overflow-hidden flex-shrink-0">
            <img src={logoSrc} alt="Logo" className="h-full w-full object-contain" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 pr-1">
              <span className="font-display text-sm font-semibold text-sidebar-foreground leading-tight break-words block">
                {companyName}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Operations", primary)}
        {renderGroup("Management", management)}
        {renderGroup("Account", account)}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Log out" onClick={handleLogout}>
              <LogOut />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed && (
          <div className="px-3.5 py-3 text-[9px] text-sidebar-foreground/50 border-t border-sidebar-border/20 mt-1 leading-normal select-none">
            <p className="font-medium">© {new Date().getFullYear()} {companyName}.</p>
            <p>All Rights Reserved.</p>
            <p className="font-semibold text-sidebar-foreground/75 mt-1">Developed by Nexovia IT Limited</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

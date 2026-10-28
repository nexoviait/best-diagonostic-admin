import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AgencySidebar } from "./agency-sidebar";
import { AgencyTopbar } from "./agency-topbar";

interface AgencyShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Same sidebar + topbar shell the staff admin dashboard uses, scoped to the Agency Portal. */
export function AgencyShell({ title, subtitle, children }: AgencyShellProps) {
  return (
    <SidebarProvider>
      <AgencySidebar />
      <SidebarInset>
        <AgencyTopbar title={title} subtitle={subtitle} />
        <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full min-w-0 max-w-[1400px] space-y-6">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

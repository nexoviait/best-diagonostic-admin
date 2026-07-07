import { Bell, Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getUser } from "@/lib/api";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const user = getUser();
  const name = user?.name || "Dr. Tahsin";
  const role = user?.role || "Administrator";
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <SidebarTrigger className="-ml-1" />
        <div className="hidden flex-col md:flex">
          <h1 className="font-display text-base font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="relative ml-auto hidden max-w-sm flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search patients, agencies, reports…"
            className="pl-9 bg-muted/60 border-transparent focus-visible:bg-background"
          />
        </div>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
        </Button>
        <div className="flex items-center gap-3 pl-2">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-xs font-semibold">{name}</p>
            <p className="text-[11px] text-muted-foreground">{role}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col px-4 pb-3 md:hidden">
        <h1 className="font-display text-base font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </header>
  );
}

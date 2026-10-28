import { useState } from "react";
import { UserCog, KeyRound } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAgency } from "@/lib/agency-api";
import { EditProfileDialog } from "./edit-profile-dialog";
import { ChangePasswordDialog } from "./change-password-dialog";

interface AgencyTopbarProps {
  title: string;
  subtitle?: string;
}

export function AgencyTopbar({ title, subtitle }: AgencyTopbarProps) {
  // Local state (not just a one-time getAgency() read) so the avatar updates immediately after
  // EditProfileDialog saves a new photo, instead of waiting for a full page reload.
  const [agency, setAgencyState] = useState(getAgency());
  const name = agency?.name || "Agency";
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <header className="no-print sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <SidebarTrigger className="-ml-1" />
        <div className="hidden flex-col md:flex">
          <h1 className="font-display text-base font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="ml-auto flex items-center gap-3 pl-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer rounded-full ring-offset-background transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <Avatar className="h-9 w-9 border border-border">
                  {agency?.logo_url && <AvatarImage src={agency.logo_url} alt={name} className="object-cover" />}
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-semibold">{name}</p>
                <p className="text-xs text-muted-foreground">Agency Partner</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                <UserCog className="mr-2 h-4 w-4" /> Edit Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
                <KeyRound className="mr-2 h-4 w-4" /> Change Password
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-xs font-semibold">{name}</p>
            <p className="text-[11px] text-muted-foreground">Agency Partner</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col px-4 pb-3 md:hidden">
        <h1 className="font-display text-base font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <EditProfileDialog open={profileOpen} onOpenChange={setProfileOpen} onUpdated={setAgencyState} />
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </header>
  );
}

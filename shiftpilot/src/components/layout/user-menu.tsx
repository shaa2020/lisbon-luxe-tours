"use client";
import Link from "next/link";
import { ArrowLeftRight, LogOut, UserRound } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "./theme-toggle";

function initials(name: string | null, email: string) {
  const src = name?.trim() || email;
  return src
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function UserMenu({ user, canSwitchPortal }: { user: { email: string; fullName: string | null }; canSwitchPortal: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full p-0.5 pr-2 text-sm hover:bg-surface-muted"
        aria-label="Account menu"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
          {initials(user.fullName, user.email)}
        </span>
        <span className="hidden max-w-40 truncate text-foreground sm:inline">{user.fullName ?? user.email}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel>
          <span className="block truncate font-medium text-foreground">{user.fullName ?? "Signed in"}</span>
          <span className="block truncate">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserRound /> Account & security
          </Link>
        </DropdownMenuItem>
        {canSwitchPortal && (
          <DropdownMenuItem asChild>
            <Link href="/portal?choose=1">
              <ArrowLeftRight /> Switch portal
            </Link>
          </DropdownMenuItem>
        )}
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        <DropdownMenuSeparator />
        <form action="/auth/signout" method="post">
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut /> Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  StickyNote,
  ListTodo,
  BarChart3,
  Settings,
  Sparkles,
  User,
  LogOut,
  ChevronDown,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { useApp } from "@/store/app-store";

export const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/goals", label: "Goals", icon: Flag },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

function useActive(): string {
  const pathname = usePathname();
  if (pathname === "/") return "/";
  return pathname;
}

export function Sidebar() {
  const active = useActive();
  const { settings } = useApp();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border-soft bg-background-deep lg:flex">
      <div className="flex items-center gap-2.5 px-6 pt-7 pb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-[#061B14]">
          <Sparkles size={19} strokeWidth={2.2} />
        </div>
        <span className="text-[17px] font-bold tracking-tight text-primary">Pulse</span>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors duration-150",
                isActive
                  ? "bg-surface-elevated font-semibold text-accent"
                  : "text-secondary hover:bg-surface-elevated/70 hover:text-primary"
              )}
            >
              <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
              {item.label}
            </Link>
          );
        })}

        {/* Profile link at bottom */}
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors duration-150",
            active === "/profile"
              ? "bg-surface-elevated font-semibold text-accent"
              : "text-secondary hover:bg-surface-elevated/70 hover:text-primary"
          )}
        >
          <User size={19} strokeWidth={active === "/profile" ? 2.2 : 1.8} />
          Profile
        </Link>
      </nav>

      <div className="px-6 py-6">
        <div className="rounded-[16px] border border-border-soft bg-surface px-4 py-3.5">
          <p className="text-[12px] text-secondary leading-relaxed">
            Small steps.
            <br />
            Big results.
          </p>
        </div>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const active = useActive();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-[#18372D] bg-background-deep/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 backdrop-blur lg:hidden"
      aria-label="Primary"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-colors duration-150",
              isActive ? "bg-[#102C23] text-accent" : "text-[#91A49C] hover:text-secondary"
            )}
          >
            <Icon size={21} strokeWidth={isActive ? 2.3 : 1.9} />
            <span className={cn("text-[10px] leading-none", isActive ? "font-semibold" : "font-normal")}>
              {item.label}
            </span>
          </Link>
        );
      })}
      <Link
        href="/profile"
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-colors duration-150",
          active === "/profile" ? "bg-[#102C23] text-accent" : "text-[#91A49C] hover:text-secondary"
        )}
      >
        <User size={21} strokeWidth={active === "/profile" ? 2.3 : 1.9} />
        <span className={cn("text-[10px] leading-none", active === "/profile" ? "font-semibold" : "font-normal")}>
          Profile
        </span>
      </Link>
    </nav>
  );
}
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Stethoscope,
  Receipt,
  Package,
  BarChart3,
  Bell,
  ChevronDown,
  Search,
  Plus,
  HelpCircle,
  Command,
} from "lucide-react";
import type { ReactNode } from "react";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/schedule", label: "Schedule", icon: CalendarDays },
  { to: "/treatments", label: "Treatments", icon: Stethoscope },
  { to: "/billing", label: "Billing", icon: Receipt },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/reports", label: "Reports", icon: BarChart3 },
];


export function AppShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />
      <main className="mx-auto max-w-[1440px] px-6 pb-20 pt-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </header>
        {children}
      </main>
    </div>
  );
}

function TopNav() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur">
      {/* Row 1: brand · search · actions */}
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-6">
        {/* Brand */}
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" strokeWidth={3} />
          </span>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold tracking-tight">Enamel</span>
              <span className="hidden rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground sm:inline">
                Clinic
              </span>
            </div>
            <div className="hidden text-[11px] text-muted-foreground sm:block">Northside Practice</div>
          </div>
        </Link>

        <div className="mx-2 hidden h-8 w-px bg-border lg:block" />

        {/* Search — center, prominent */}
        <div className="relative hidden flex-1 max-w-xl md:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search patients, invoices, appointments…"
            className="h-10 w-full rounded-full border border-border bg-background pl-10 pr-16 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring/40"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline-flex">
            <Command className="h-3 w-3" /> K
          </kbd>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Quick create */}
          <button className="hidden items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 sm:inline-flex">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.75} />
            New
          </button>

          <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

          {/* Icon actions */}
          <button
            aria-label="Help"
            className="hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground sm:inline-flex"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          <button
            aria-label="Notifications"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
          </button>

          {/* User */}
          <button className="ml-1 flex items-center gap-2.5 rounded-full border border-border bg-card py-1 pl-1 pr-2.5 transition hover:bg-muted">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-accent-foreground">
              DR
            </span>
            <div className="hidden pr-0.5 text-left sm:block">
              <div className="text-xs font-semibold leading-tight">Dr. Rina Okafor</div>
              <div className="text-[10px] leading-tight text-muted-foreground">Lead Dentist</div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Row 2: primary nav — dedicated row for clarity */}
      <div className="border-t border-border/60">
        <nav className="mx-auto flex max-w-[1440px] items-center gap-1 overflow-x-auto px-4 py-2">
          {NAV.map((n) => {
            const active = n.exact ? currentPath === n.to : currentPath.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={
                  "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition " +
                  (active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground")
                }
              >
                <n.icon className="h-3.5 w-3.5" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/* ---------- reusable primitives ---------- */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={"rounded-3xl bg-card p-6 ring-1 ring-border " + className}>{children}</div>
  );
}

export function SectionHeader({
  title,
  action,
  icon: Icon,
}: {
  title: string;
  action?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-accent-foreground">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      {action}
    </div>
  );
}

export function Pill({
  tone = "default",
  children,
}: {
  tone?: "default" | "success" | "warn" | "danger" | "info" | "muted";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    default: "bg-primary text-primary-foreground",
    success: "bg-primary text-primary-foreground",
    warn: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-700",
    info: "bg-primary-soft text-accent-foreground",
    muted: "bg-muted text-muted-foreground ring-1 ring-border",
  };
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium " +
        tones[tone]
      }
    >
      {children}
    </span>
  );
}

export function IconButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
    >
      {children}
    </button>
  );
}

export function PrimaryButton({
  children,
  icon: Icon,
}: {
  children: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  icon: Icon,
}: {
  children: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useClinic } from "@/hooks/use-clinic";
import { usePermissions } from "@/hooks/use-permissions";
import type { Permission } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CalendarClock,
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
  ListChecks,
  RefreshCcw,
  ShieldCheck,
  Building2,
  Check,
  MessageSquare,
} from "lucide-react";
import type { ReactNode } from "react";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  perms?: Permission[]; // if omitted, all authenticated members see it
};
const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/patients", label: "Patients", icon: Users, perms: ["patients.view"] },
  { to: "/schedule", label: "Schedule", icon: CalendarDays, perms: ["schedule.view"] },
  { to: "/bookings", label: "Bookings", icon: CalendarClock, perms: ["bookings.manage"] },
  { to: "/waitlist", label: "Waitlist", icon: ListChecks, perms: ["waitlist.manage", "schedule.view"] },
  { to: "/recalls", label: "Recalls", icon: RefreshCcw, perms: ["recalls.manage"] },
  { to: "/treatments", label: "Treatments", icon: Stethoscope, perms: ["clinical.edit"] },
  { to: "/communications", label: "Messages", icon: MessageSquare, perms: ["patients.view"] },
  { to: "/billing", label: "Billing", icon: Receipt, perms: ["billing.view"] },
  { to: "/inventory", label: "Inventory", icon: Package, perms: ["inventory.manage"] },
  { to: "/reports", label: "Reports", icon: BarChart3, perms: ["reports.view", "reports.viewOwn"] },
  { to: "/staff", label: "Staff", icon: ShieldCheck, perms: ["staff.manage"] },
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
      <main className="mx-auto max-w-[1440px] px-4 pb-20 pt-6 sm:px-6">
        <header className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
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
  const { canAny } = usePermissions();
  const { platformRole } = useClinic();
  const visibleNav = NAV.filter((n) => !n.perms || canAny(n.perms));
  const isSuper = platformRole === "super_admin";


  return (
    <div className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur">
      {/* Row 1: brand · search · actions */}
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:gap-4 sm:px-6">
        {/* Brand */}
        <Link to="/dashboard" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" strokeWidth={3} />
          </span>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold tracking-tight">Enamel</span>
            </div>
          </div>
        </Link>

        {/* Clinic switcher */}
        <ClinicSwitcher />

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
          <UserMenu />
        </div>
      </div>



      {/* Row 2: primary nav — dedicated row for clarity */}
      <div className="border-t border-border/60">
        <nav className="mx-auto flex max-w-[1440px] items-center gap-1 overflow-x-auto px-3 py-2 sm:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleNav.map((n) => {
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
          {isSuper && (
            <Link
              to="/platform/clinics"
              className={
                "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition " +
                (currentPath.startsWith("/platform")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground")
              }
            >
              <Building2 className="h-3.5 w-3.5" />
              Platform
            </Link>
          )}
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
  onClick,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  icon: Icon,
  onClick,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}


const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  dentist: "Dentist",
  hygienist: "Hygienist",
  assistant: "Assistant",
  front_desk: "Front desk",
  billing_specialist: "Billing",
  read_only_auditor: "Auditor",
};

function UserMenu() {
  const { user, profile, loading } = useAuth();
  const { activeRole, isSuperAdmin } = useClinic();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const name = profile?.full_name ?? user?.email ?? "Account";
  const initials = (name || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const roleLabel = isSuperAdmin
    ? "Super admin"
    : activeRole
    ? ROLE_LABEL[activeRole] ?? activeRole
    : loading
    ? ""
    : "No role";


  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="ml-1 flex items-center gap-2.5 rounded-full border border-border bg-card py-1 pl-1 pr-2.5 transition hover:bg-muted"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-accent-foreground">
          {initials || "?"}
        </span>
        <div className="hidden pr-0.5 text-left sm:block">
          <div className="text-xs font-semibold leading-tight">{name}</div>
          <div className="text-[10px] leading-tight text-muted-foreground">{roleLabel}</div>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-border bg-card p-1 ring-1 ring-border/50">
          <div className="px-3 py-2">
            <div className="text-xs font-semibold">{name}</div>
            <div className="truncate text-[11px] text-muted-foreground">{user?.email}</div>
          </div>
          <div className="my-1 h-px bg-border" />
          <button
            onClick={signOut}
            className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-muted"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function ClinicSwitcher() {
  const { memberships, activeClinic, activeRole, switchClinic, loading, isSuperAdmin } = useClinic();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (loading) return null;
  if (!activeClinic && memberships.length === 0 && !isSuperAdmin) return null;

  const label = activeClinic?.name ?? "Select clinic";
  const roleLabel = activeRole
    ? activeRole.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : isSuperAdmin
    ? "Super admin"
    : "";

  return (
    <div className="relative ml-1" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 transition hover:bg-muted"
      >
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="hidden text-left sm:block">
          <div className="text-xs font-semibold leading-tight">{label}</div>
          {roleLabel && (
            <div className="text-[10px] leading-tight text-muted-foreground">{roleLabel}</div>
          )}
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-64 rounded-xl border border-border bg-card p-1 ring-1 ring-border/50">
          <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Your clinics
          </div>
          {memberships.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">You aren't a member of any clinic yet.</div>
          )}
          {memberships.map((m) => (
            <button
              key={m.clinic_id}
              onClick={() => {
                setOpen(false);
                if (m.clinic_id !== activeClinic?.id) void switchClinic(m.clinic_id);
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-muted"
            >
              <div>
                <div className="font-semibold">{m.clinic.name}</div>
                <div className="text-[10px] text-muted-foreground">{m.role.replace("_", " ")}</div>
              </div>
              {m.clinic_id === activeClinic?.id && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
          <div className="my-1 h-px bg-border" />
          <button
            onClick={() => {
              setOpen(false);
              navigate({ to: "/onboarding" });
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-muted"
          >
            <Plus className="h-3.5 w-3.5" /> Add another clinic
          </button>
        </div>
      )}
    </div>
  );
}

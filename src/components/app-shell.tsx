import { Link, useRouterState } from "@tanstack/react-router";
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
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

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
  eyebrow,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <TopNav />
      <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <PageHeader title={title} subtitle={subtitle} eyebrow={eyebrow} actions={actions} />
        {children}
      </main>
    </div>
  );
}

function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:flex-wrap sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-eyebrow mb-2 flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-primary" />
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-display text-[34px] sm:text-[40px] text-foreground">{title}</h1>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">{actions}</div>
      ) : null}
    </header>
  );
}

function TopNav() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <div
      className={
        "sticky top-0 z-30 border-b transition-all duration-300 " +
        (scrolled
          ? "border-border bg-background/80 backdrop-blur-xl backdrop-saturate-150"
          : "border-transparent bg-background/60 backdrop-blur-md")
      }
    >
      {/* Row 1 — brand · search · user */}
      <div className="mx-auto grid h-16 max-w-[1440px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 sm:flex sm:px-6 lg:px-8">
        <Link
          to="/"
          className="group flex min-w-0 items-center gap-3 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-primary-foreground shadow-sm ring-1 ring-black/5"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            <span className="text-serif text-[17px] font-semibold" style={{ fontFamily: "var(--font-serif)" }}>E</span>
          </span>
          <div className="min-w-0 leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">Enamel</div>
            <div className="text-eyebrow -mt-0.5" style={{ letterSpacing: "0.14em" }}>Dental OS</div>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:ml-auto sm:gap-3">
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search patients, invoices, procedures…"
              aria-label="Global search"
              className="h-10 w-[280px] rounded-full border border-border bg-card pl-9 pr-16 text-sm text-foreground outline-none transition focus:w-[340px] focus:border-border-strong focus:ring-2 focus:ring-ring/30"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular">
              ⌘K
            </kbd>
          </div>
          <button
            aria-label="Notifications"
            className="u-focus-ring relative rounded-full border border-border bg-card p-2.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Bell className="h-4 w-4" strokeWidth={1.75} />
            <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-semibold text-white ring-2 ring-card">
              3
            </span>
          </button>
          <button className="u-focus-ring hidden items-center gap-2.5 rounded-full border border-border bg-card px-1.5 py-1 pr-3 transition hover:bg-muted sm:flex">
            <span className="relative grid h-8 w-8 place-items-center rounded-xl bg-primary-soft text-[12px] font-semibold text-accent-foreground">
              RO
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-card" />
            </span>
            <div className="hidden text-left leading-tight lg:block">
              <div className="text-[13px] font-semibold">Dr. Rina Okafor</div>
              <div className="text-[11px] text-muted-foreground">Lead Dentist</div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Row 2 — pill nav */}
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-[1440px] items-center gap-1 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8"
      >
        {NAV.map((n) => {
          const active = n.exact ? currentPath === n.to : currentPath.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              className={
                "u-focus-ring group relative inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors " +
                (active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute inset-0 -z-0 rounded-full border border-border bg-card shadow-sm"
                />
              ) : null}
              <n.icon
                className={"relative z-10 h-4 w-4 " + (active ? "text-primary" : "")}
                strokeWidth={1.75}
              />
              <span className="relative z-10">{n.label}</span>
            </Link>
          );
        })}
        <div className="ml-auto hidden items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground md:flex">
          <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
          <span className="tabular">Cycle · Q4 · Week 3</span>
        </div>
      </nav>
    </div>
  );
}

/* ---------- reusable primitives ---------- */

export function Card({
  children,
  className = "",
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "hero" | "sunken";
}) {
  const base =
    variant === "hero"
      ? "u-card-hero"
      : variant === "sunken"
        ? "rounded-3xl border border-border bg-[var(--surface-sunken)]"
        : "u-card rounded-3xl";
  return <div className={base + " p-6 " + className}>{children}</div>;
}

export function SectionCard({
  title,
  description,
  action,
  icon: Icon,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={"u-card overflow-hidden " + className}>
      <header className="flex items-start justify-between gap-3 border-b border-border/70 px-6 py-4">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-accent-foreground">
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
          ) : null}
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold leading-tight">{title}</h3>
            {description ? (
              <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {action}
      </header>
      <div className={"p-6 " + bodyClassName}>{children}</div>
    </section>
  );
}

export function SectionHeader({
  title,
  action,
  icon: Icon,
}: {
  title: string;
  action?: ReactNode;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon ? (
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-soft text-accent-foreground">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
        ) : null}
        <h3 className="truncate text-[14px] font-semibold tracking-tight">{title}</h3>
      </div>
      {action}
    </div>
  );
}

type Tone = "neutral" | "success" | "warn" | "danger" | "info" | "primary";

const TONE_MAP: Record<Tone, { bg: string; text: string; dot: string; ring: string }> = {
  neutral: { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground/60", ring: "ring-border" },
  primary: { bg: "bg-primary-soft", text: "text-accent-foreground", dot: "bg-primary", ring: "ring-primary/20" },
  success: { bg: "bg-success-soft", text: "text-success-foreground", dot: "bg-success", ring: "ring-success/20" },
  warn: { bg: "bg-warning-soft", text: "text-warning-foreground", dot: "bg-warning", ring: "ring-warning/20" },
  danger: { bg: "bg-danger-soft", text: "text-danger-foreground", dot: "bg-danger", ring: "ring-danger/20" },
  info: { bg: "bg-info-soft", text: "text-info-foreground", dot: "bg-info", ring: "ring-info/20" },
};

export function StatusBadge({
  tone = "neutral",
  children,
  dot = true,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  const t = TONE_MAP[tone];
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset " +
        t.bg + " " + t.text + " " + t.ring + " " + className
      }
    >
      {dot ? <span className={"h-1.5 w-1.5 rounded-full " + t.dot} /> : null}
      {children}
    </span>
  );
}

// Backwards-compat alias — some routes still import `Pill`.
export function Pill({
  tone = "default",
  children,
}: {
  tone?: "default" | "success" | "warn" | "danger" | "info" | "muted" | "primary" | "neutral";
  children: ReactNode;
}) {
  const map: Record<string, Tone> = {
    default: "primary",
    primary: "primary",
    success: "success",
    warn: "warn",
    danger: "danger",
    info: "info",
    muted: "neutral",
    neutral: "neutral",
  };
  return <StatusBadge tone={map[tone] ?? "neutral"}>{children}</StatusBadge>;
}

export function DeltaChip({
  value,
  up,
}: {
  value: string;
  up?: boolean;
}) {
  return (
    <span
      className={
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular ring-1 ring-inset " +
        (up
          ? "bg-success-soft text-success-foreground ring-success/20"
          : "bg-danger-soft text-danger-foreground ring-danger/20")
      }
    >
      {up ? (
        <ArrowUpRight className="h-3 w-3" strokeWidth={2.25} />
      ) : (
        <ArrowDownRight className="h-3 w-3" strokeWidth={2.25} />
      )}
      {value}
    </span>
  );
}

export function StatCard({
  eyebrow,
  value,
  unit,
  delta,
  up,
  spark,
  caption,
  icon: Icon,
}: {
  eyebrow: string;
  value: string;
  unit?: string;
  delta?: string;
  up?: boolean;
  spark?: ReactNode;
  caption?: ReactNode;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <article className="u-card u-hover-lift group relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon ? (
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-accent-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
          ) : null}
          <div className="text-eyebrow">{eyebrow}</div>
        </div>
        {delta ? <DeltaChip value={delta} up={up} /> : null}
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-metric text-[38px] text-foreground">{value}</span>
        {unit ? <span className="text-[12px] font-medium text-muted-foreground">{unit}</span> : null}
      </div>

      {spark ? <div className="mt-3 h-10">{spark}</div> : null}

      {caption ? (
        <div className="mt-3 border-t border-border/60 pt-3 text-[12px] text-muted-foreground">
          {caption}
        </div>
      ) : null}
    </article>
  );
}

export function Toolbar({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={"u-card flex flex-wrap items-center gap-2 px-3 py-2 sm:gap-3 " + className}>
      {children}
    </div>
  );
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-muted p-1">
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={
              "u-focus-ring rounded-full px-3 py-1.5 text-[12px] font-medium transition " +
              (active
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
      {Icon ? (
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-accent-foreground">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
      ) : null}
      <div>
        <div className="text-[14px] font-semibold">{title}</div>
        {description ? (
          <div className="mt-1 max-w-sm text-[12px] text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function IconButton({
  children,
  onClick,
  ariaLabel,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={
        "u-focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground transition hover:border-border-strong hover:bg-muted " +
        className
      }
    >
      {children}
    </button>
  );
}

export function PrimaryButton({
  children,
  icon: Icon,
  onClick,
}: {
  children: ReactNode;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="u-focus-ring inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium text-primary-foreground transition hover:brightness-110"
      style={{ backgroundImage: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
    >
      {Icon ? <Icon className="h-4 w-4" strokeWidth={1.75} /> : null}
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  icon: Icon,
  onClick,
}: {
  children: ReactNode;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="u-focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[13px] font-medium text-foreground transition hover:border-border-strong hover:bg-muted"
    >
      {Icon ? <Icon className="h-4 w-4" strokeWidth={1.75} /> : null}
      {children}
    </button>
  );
}

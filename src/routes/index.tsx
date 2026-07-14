import { createFileRoute } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Activity,
  CalendarDays,
  Pill,
  FlaskConical,
  MessageSquare,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Share2,
  Plus,
  MoreHorizontal,
  CreditCard,
  Clock,
  Plus as PlusIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

/* ---------- mock data ---------- */

const heartRateSpark = [12, 18, 10, 22, 14, 28, 16, 30, 20, 34, 18, 26, 14, 22, 16, 28, 18, 34, 20, 26, 14];
const bpSpark = [10, 12, 14, 13, 16, 18, 17, 20, 22, 20, 18, 16];
const glucoseSpark = [8, 14, 10, 18, 12, 22, 14, 26, 16, 30, 18, 24, 12, 20, 14, 26, 16, 30, 18, 24, 14, 22];
const weightSpark = Array.from({ length: 26 }, (_, i) => 12 + Math.round(Math.sin(i / 2) * 6 + i * 0.4));

// Treatment progress: 7 days x ~7 bars per day
const treatmentData = [
  [22, 8, 30, 12, 42, 18, 46],
  [102, 44, 24, 78, 136, 34, 62],
  [50, 18, 76, 30, 120, 128, 98],
  [8, 112, 46, 32, 74, 62, 106],
  [30, 62, 138, 76, 22, 68, 44],
  [44, 100, 90, 30, 60, 84, 46],
  [4, 30, 60, 72, 114, 122, 142, 100, 56],
];
const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

/* ---------- shell ---------- */

function DashboardPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />
      <main className="mx-auto max-w-[1400px] px-6 pb-16 pt-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard Overview</h1>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
              <Share2 className="h-4 w-4" />
              Share Report
            </button>
            <button className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90">
              <Plus className="h-4 w-4" />
              Add Readings
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Heart Rate"
            value="76"
            unit="bpm"
            spark={<LineSpark data={heartRateSpark} />}
            caption={
              <>
                Resting heart rate within <strong className="text-foreground">normal range</strong>{" "}
                <span className="whitespace-nowrap">60–100 bpm</span>
              </>
            }
          />
          <MetricCard
            title="Blood Pressure"
            value="118/76"
            unit="mmHg"
            spark={<LineSpark data={bpSpark} smooth />}
            caption="Systolic slightly lower than last week — good stability observed"
          />
          <MetricCard
            title="Blood Glucose"
            value="96"
            unit="mg/dL"
            spark={<BarsSpark data={glucoseSpark} />}
            caption={
              <>
                Morning fasting glucose increased by{" "}
                <strong className="text-foreground">9%</strong> than last week
              </>
            }
          />
          <MetricCard
            title="Weight"
            value="72.4"
            unit="kg"
            spark={<BarsSpark data={weightSpark} mixed />}
            caption={
              <>
                Weight decreased by <strong className="text-foreground">1.1%</strong> this month — healthy progress
              </>
            }
          />
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
          <TreatmentProgress />
          <UpcomingVisits />
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_380px]">
          <PaymentsHistory />
          <RecentActivity />
          <MyAppointments />
        </section>
      </main>
    </div>
  );
}

/* ---------- top nav ---------- */

function TopNav() {
  const items = [
    { icon: LayoutDashboard, label: "Dashboard", active: true },
    { icon: Activity, label: "Health Data" },
    { icon: CalendarDays, label: "Appointment" },
    { icon: Pill, label: "Medications" },
    { icon: FlaskConical, label: "Test Results" },
    { icon: MessageSquare, label: "Messages" },
  ];
  return (
    <div className="border-b border-border bg-card/60 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-6 px-6">
        <a href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <PlusIcon className="h-4 w-4" strokeWidth={3} />
          </span>
          <span className="text-lg font-semibold tracking-tight">Curelo</span>
        </a>

        <nav className="hidden items-center gap-1 rounded-full bg-muted/60 p-1 lg:flex">
          {items.map((it) => (
            <button
              key={it.label}
              className={
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition " +
                (it.active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button className="relative rounded-full border border-border bg-card p-2 text-muted-foreground hover:text-foreground">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
          </button>
          <div className="flex items-center gap-3 rounded-full border border-border bg-card px-2 py-1.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-accent-foreground">
              AS
            </span>
            <div className="pr-2 text-left">
              <div className="text-sm font-semibold leading-tight">Albert Sans</div>
              <div className="text-xs text-muted-foreground leading-tight">CR-20456</div>
            </div>
            <ChevronDown className="mr-1 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- metric card ---------- */

function MetricCard({
  title,
  value,
  unit,
  spark,
  caption,
}: {
  title: string;
  value: string;
  unit: string;
  spark: React.ReactNode;
  caption: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-card p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)] ring-1 ring-border">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <button className="rounded-full p-1 text-muted-foreground hover:bg-muted">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-semibold tracking-tight text-foreground">{value}</span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
      <div className="mt-4 grid grid-cols-[100px_1fr] items-center gap-3">
        <div className="h-10 w-full text-primary">{spark}</div>
        <p className="text-xs leading-relaxed text-muted-foreground">{caption}</p>
      </div>
    </div>
  );
}

/* ---------- spark charts (pure SVG/divs) ---------- */

function LineSpark({ data, smooth = false }: { data: number[]; smooth?: boolean }) {
  const w = 100;
  const h = 40;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - ((v - min) / range) * (h - 6) - 3] as const);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  if (smooth) {
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const cx = (x0 + x1) / 2;
      d += ` Q ${cx} ${y0}, ${cx} ${(y0 + y1) / 2} T ${x1} ${y1}`;
    }
  } else {
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0]} ${pts[i][1]}`;
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarsSpark({ data, mixed = false }: { data: number[]; mixed?: boolean }) {
  const max = Math.max(...data);
  return (
    <div className="flex h-10 items-end gap-[2px]">
      {data.map((v, i) => (
        <span
          key={i}
          className={
            "w-[3px] rounded-sm " +
            (mixed && i % 5 === 0 ? "bg-primary-muted" : "bg-primary")
          }
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
    </div>
  );
}

/* ---------- treatment progress ---------- */

function TreatmentProgress() {
  const allBars = treatmentData.flat();
  const max = Math.max(...allBars, 150);
  return (
    <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Treatment Progress Overview</h3>
        <div className="flex items-center gap-4">
          <Legend swatch="bg-primary" label="Progress" />
          <Legend swatch="bg-primary-soft" label="Recovery" />
          <button className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-muted">
            Last Month
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-[32px_1fr] gap-3">
        <div className="flex flex-col justify-between py-1 text-right text-[10px] text-muted-foreground">
          <span>150</span>
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="border-t border-dashed border-border/70" />
            ))}
          </div>
          <div className="relative grid h-56 grid-cols-7">
            {treatmentData.map((group, gi) => (
              <div key={gi} className="flex items-end justify-center gap-[6px] px-2">
                {group.map((v, bi) => (
                  <span
                    key={bi}
                    className={
                      "w-2 rounded-sm " +
                      (bi % 3 === 2 ? "bg-primary-soft" : "bg-primary")
                    }
                    style={{ height: `${(v / max) * 100}%` }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 text-center text-[10px] font-medium tracking-wider text-muted-foreground">
            {days.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className={"h-2.5 w-2.5 rounded-sm " + swatch} />
      {label}
    </div>
  );
}

/* ---------- upcoming visits (calendar) ---------- */

function UpcomingVisits() {
  // September 2025: starts Monday. Leading Sun = Aug 31; using shown grid.
  const weeks = [
    ["01", "02", "03", "04", "05", "06", "08"], // as in reference
    ["09", "10", "11", "12", "13", "14", "15"],
    ["16", "17", "18", "19", "20", "21", "22"],
    ["23", "24", "25", "26", "27", "28", "29"],
    ["30", "31", "01", "02", "03", "04", "05"],
  ];
  const available = new Set([
    "09","10","11","12","13","14","15",
    "16","17","18","19","20","21","22",
    "23","24","26","27","28","29",
    "30","31","01","02","03","04","05",
  ]);
  const selected = "25";
  return (
    <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Upcoming Visits</h3>
        <button className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
          See details
        </button>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="text-sm font-medium">September 2025</div>
        <div className="flex items-center gap-1">
          <button className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="rounded-full bg-primary p-1.5 text-primary-foreground hover:opacity-90">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <Legend swatch="bg-primary-soft" label="Available" />
        <Legend swatch="bg-primary" label="Selected" />
        <Legend swatch="bg-muted" label="Unavailable" />
      </div>

      <div className="mt-4 grid grid-cols-7 gap-y-2 text-center text-[11px] text-muted-foreground">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-y-2 text-center text-sm">
        {weeks.flat().map((day, i) => {
          const isSelected = day === selected && Math.floor(i / 7) === 3;
          const isAvail = available.has(day) && !isSelected;
          return (
            <div key={i} className="flex items-center justify-center">
              <span
                className={
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium " +
                  (isSelected
                    ? "bg-primary text-primary-foreground"
                    : isAvail
                      ? "bg-primary-soft text-foreground"
                      : "bg-muted text-muted-foreground")
                }
              >
                {day}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <div className="text-sm font-semibold">My Appointments</div>
      </div>
    </div>
  );
}

/* ---------- payments ---------- */

function PaymentsHistory() {
  const rows = [
    { label: "USG + Consultation", status: "Paid" },
    { label: "Blood Panel", status: "Paid" },
    { label: "Physio Session", status: "Pending" },
  ];
  return (
    <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-accent-foreground">
            <CreditCard className="h-4 w-4" />
          </span>
          <h3 className="text-base font-semibold">Payments History</h3>
        </div>
        <button className="rounded-full p-1 text-muted-foreground hover:bg-muted">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      <ul className="mt-4 space-y-2">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted-foreground">
                <CreditCard className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium">{r.label}</span>
            </div>
            <span
              className={
                "rounded-full px-3 py-1 text-xs font-medium " +
                (r.status === "Paid"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground ring-1 ring-border")
              }
            >
              {r.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- recent activity ---------- */

function RecentActivity() {
  const items = [
    { title: "Follow-up with Dr. James Wong", date: "Oct 14, 2025" },
    { title: "Blood test results uploaded", date: "Oct 10, 2025" },
    { title: "Prescription renewed — Metformin", date: "Oct 06, 2025" },
  ];
  return (
    <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-accent-foreground">
            <Clock className="h-4 w-4" />
          </span>
          <h3 className="text-base font-semibold">Recent Activity</h3>
        </div>
        <button className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
          This Month
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      <ol className="mt-5 space-y-5">
        {items.map((it, i) => (
          <li key={it.title} className="relative pl-6">
            <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary-soft" />
            {i < items.length - 1 && (
              <span className="absolute left-[4px] top-4 h-full w-px bg-border" />
            )}
            <div className="text-sm font-medium text-foreground">{it.title}</div>
            <div className="text-xs text-muted-foreground">{it.date}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------- appointments card ---------- */

function MyAppointments() {
  const appts = [
    { time: "09:00 am", who: "Dr. James Wong", type: "Cardiology follow-up" },
    { time: "11:30 am", who: "Dr. Ana Reyes", type: "Nutrition review" },
    { time: "03:15 pm", who: "Lab — Curelo Clinic", type: "Blood panel draw" },
  ];
  return (
    <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
      <h3 className="text-base font-semibold">My Appointments</h3>
      <ul className="mt-4 space-y-3">
        {appts.map((a) => (
          <li key={a.time} className="flex items-start gap-3 rounded-2xl bg-muted/60 p-3">
            <div className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-card px-2 py-2 text-center ring-1 ring-border">
              <span className="text-xs font-semibold text-foreground">{a.time.split(" ")[0]}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {a.time.split(" ")[1]}
              </span>
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{a.who}</div>
              <div className="truncate text-xs text-muted-foreground">{a.type}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

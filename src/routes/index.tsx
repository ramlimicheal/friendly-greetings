import { createFileRoute, Link } from "@tanstack/react-router";
import { LayoutDashboard, CalendarDays, Stethoscope, Receipt, Sparkles, Search, ChevronDown, ArrowRight } from "lucide-react";
import heroImg from "@/assets/enamel-hero.jpg";
import card1 from "@/assets/enamel-card-1.jpg";
import card2 from "@/assets/enamel-card-2.jpg";
import card3 from "@/assets/enamel-card-3.jpg";
import card4 from "@/assets/enamel-card-4.jpg";
import avatarImg from "@/assets/enamel-avatar.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Enamel — The calm operating system for modern dental clinics" },
      { name: "description", content: "Enamel brings scheduling, charting, billing and patient communication into one calm, connected workspace for dental teams." },
      { property: "og:title", content: "Enamel — The operating system for modern dental clinics" },
      { property: "og:description", content: "Scheduling, charting, billing and patient communication in one calm, connected workspace." },
    ],
  }),
  component: LandingPage,
});

const navItems = [
  { label: "Product", icon: LayoutDashboard, active: true },
  { label: "Scheduling", icon: CalendarDays },
  { label: "Clinical", icon: Stethoscope },
  { label: "Billing", icon: Receipt },
  { label: "AI", icon: Sparkles },
];

const features = [
  {
    img: card1,
    tag: "scheduling",
    code: "MOD-#sched",
    category: "chair grid / real-time",
    title: "Chair-based scheduling with drag-to-reschedule and conflict guardrails",
    meta: "6 chairs · live",
    status: "Included",
  },
  {
    img: card2,
    tag: "clinical",
    code: "MOD-#chart",
    category: "odontogram / notes",
    title: "Anatomical odontogram, treatment plans and signed SOAP notes",
    meta: "AI dictation",
    status: "",
  },
  {
    img: card3,
    tag: null,
    code: "MOD-#comms",
    category: "patient / portal",
    title: "Patient portal, digital intake and two-way SMS + email reminders",
    meta: "HIPAA-ready",
    status: "Included",
  },
  {
    img: card4,
    tag: "billing",
    code: "MOD-#ledger",
    category: "invoices / claims",
    title: "Invoice ledger, ADA J400 claims and A/R aging in one screen",
    meta: "no add-ons",
    status: "",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#eef0ec] p-4 sm:p-6 lg:p-8 font-sans">
      <div className="mx-auto max-w-[1400px]">
        {/* Green hero panel */}
        <div className="relative overflow-hidden rounded-[28px] bg-[#7a8968] p-6 sm:p-8 lg:p-10">
          {/* Top nav */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-white text-2xl font-serif italic tracking-tight">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-white/90" />
              enamel<span className="text-white">.</span>
            </div>

            <nav className="hidden md:flex items-center gap-1 rounded-full bg-white/10 backdrop-blur-sm p-1.5 border border-white/15">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                      item.active
                        ? "bg-white text-[#2a2a2a] font-medium shadow-sm"
                        : "text-white/90 hover:bg-white/10"
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              <Link to="/auth" className="hidden sm:inline text-white/90 text-sm hover:text-white">Sign in</Link>
              <div className="h-11 w-11 rounded-full overflow-hidden ring-2 ring-white/40">
                <img src={avatarImg} alt="Account" className="h-full w-full object-cover" />
              </div>
            </div>
          </div>

          {/* Hero content */}
          <div className="relative mt-10 lg:mt-14 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <h1 className="lg:col-span-8 text-white text-4xl sm:text-5xl lg:text-6xl leading-[1.05] font-light tracking-tight max-w-3xl">
              The calm operating system<br className="hidden sm:block" /> for modern dental clinics
            </h1>
            <p className="lg:col-span-4 text-white/85 text-sm leading-relaxed max-w-xs lg:mt-3">
              Enamel unifies scheduling, charting, billing and patient communication in one connected workspace — so your team can focus on care, not software.
            </p>
          </div>

          {/* Hero image */}
          <div className="relative mt-8 h-[220px] sm:h-[280px] lg:h-[340px] rounded-2xl overflow-hidden">
            <img src={heroImg} alt="Dentist reviewing schedule on a tablet in a bright modern clinic" width={1600} height={900} className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#7a8968]/20 via-transparent to-[#7a8968]/40" />
          </div>

          {/* Filter / CTA row */}
          <div className="relative -mt-8 flex flex-wrap items-center justify-between gap-4 px-2">
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded-full bg-white text-[#2a2a2a] px-5 py-2.5 text-sm font-medium shadow-sm">
                All modules
              </button>
              <button className="text-white/90 text-sm px-3 py-2 hover:text-white">Front desk</button>
              <button className="text-white/90 text-sm px-3 py-2 hover:text-white">Dentists</button>
              <button className="text-white/90 text-sm px-3 py-2 hover:text-white">Billing</button>
              <button className="text-white/90 text-sm px-3 py-2 hover:text-white">Patients</button>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/book" className="rounded-full bg-white text-[#2a2a2a] px-5 py-2.5 text-sm font-medium shadow-sm">
                See patient booking
              </Link>
              <Link to="/auth" className="rounded-full bg-[#1a1a1a] text-white px-5 py-2.5 text-sm font-medium inline-flex items-center gap-2">
                Start free trial <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* White feature panel */}
          <div className="mt-6 rounded-[24px] bg-white p-5 sm:p-6 lg:p-7 shadow-xl">
            {/* Panel header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <button className="flex items-center gap-2 text-[#2a2a2a] text-sm font-medium">
                Featured modules
                <ChevronDown className="h-4 w-4" strokeWidth={2} />
              </button>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search a feature"
                    className="w-64 rounded-full bg-[#f3f4f0] pl-9 pr-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#7a8968]/30"
                  />
                </div>
                <button className="rounded-full bg-[#1a1a1a] text-white px-5 py-2.5 text-sm font-medium">
                  Compare plans
                </button>
              </div>
            </div>

            {/* Feature grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.map((p) => (
                <div key={p.title} className="flex flex-col">
                  <div className="relative rounded-2xl overflow-hidden aspect-[4/5] bg-gray-100">
                    <img src={p.img} alt={p.title} loading="lazy" width={800} height={1000} className="w-full h-full object-cover" />
                    {p.tag && (
                      <span className="absolute top-3 left-3 rounded-full bg-white/85 backdrop-blur px-3 py-1 text-[11px] text-gray-700">
                        {p.tag}
                      </span>
                    )}
                    <span className="absolute bottom-3 right-3 rounded-full bg-white/85 backdrop-blur px-3 py-1 text-[11px] text-gray-700 font-medium">
                      {p.code}
                    </span>
                  </div>
                  <div className="mt-3 px-1">
                    <p className="text-[11px] text-gray-400 tracking-wide">{p.category}</p>
                    <h3 className="mt-1.5 text-[13px] leading-snug text-[#2a2a2a] font-medium line-clamp-2 min-h-[38px]">
                      {p.title}
                    </h3>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-[13px] font-semibold text-[#2a2a2a]">{p.meta}</span>
                      {p.status && <span className="text-[11px] text-gray-400">· {p.status}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Collapsible sections */}
            <div className="mt-6 divide-y divide-gray-100 border-t border-gray-100">
              <button className="w-full flex items-center gap-2 py-4 text-sm text-[#2a2a2a]">
                Insurance, claims & payments
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>
              <button className="w-full flex items-center gap-2 py-4 text-sm text-[#2a2a2a]">
                Multi-clinic, roles & audit log
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Footer strip */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-white/70 text-xs px-2">
            <span>© {new Date().getFullYear()} Enamel — built for dental teams</span>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-white">Pricing</a>
              <a href="#" className="hover:text-white">Security</a>
              <a href="#" className="hover:text-white">Contact</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { LayoutDashboard, CalendarDays, Stethoscope, Receipt, Sparkles, Search, ChevronDown, ArrowRight, Check, Shield, Zap, Users, MessageSquare, CreditCard, FileText, Activity, Lock, Clock, TrendingUp, Star } from "lucide-react";
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
          <div className="relative mt-10 lg:mt-14 grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-6 items-end">
            <h1 className="lg:col-span-8 text-white text-4xl sm:text-5xl lg:text-6xl leading-[1.05] font-light tracking-tight">
              The calm operating system<br className="hidden sm:block" /> for modern dental clinics
            </h1>
            <p className="lg:col-span-4 text-white/85 text-sm leading-relaxed max-w-sm">
              Enamel unifies scheduling, charting, billing and patient communication in one connected workspace — so your team can focus on care, not software.
            </p>
          </div>

          {/* Filter + CTA row (single aligned row, above image) */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1">
              <button className="rounded-full bg-white text-[#2a2a2a] px-5 py-2.5 text-sm font-medium shadow-sm">
                All modules
              </button>
              <button className="text-white/90 text-sm px-3 py-2 hover:text-white">Front desk</button>
              <button className="text-white/90 text-sm px-3 py-2 hover:text-white">Dentists</button>
              <button className="text-white/90 text-sm px-3 py-2 hover:text-white">Billing</button>
              <button className="text-white/90 text-sm px-3 py-2 hover:text-white">Patients</button>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/book" className="rounded-full bg-white/10 border border-white/20 text-white px-5 py-2.5 text-sm font-medium hover:bg-white/15">
                See patient booking
              </Link>
              <Link to="/auth" className="rounded-full bg-[#1a1a1a] text-white px-5 py-2.5 text-sm font-medium inline-flex items-center gap-2">
                Start free trial <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Hero image */}
          <div className="relative mt-6 h-[220px] sm:h-[300px] lg:h-[380px] rounded-2xl overflow-hidden">
            <img src={heroImg} alt="Dentist reviewing schedule on a tablet in a bright modern clinic" width={1600} height={900} className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#7a8968]/20 via-transparent to-[#7a8968]/40" />
          </div>

          {/* White feature panel */}
          <div className="mt-6 rounded-[24px] bg-white p-5 sm:p-6 lg:p-8 shadow-xl">
            {/* Panel header */}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 mb-6 sm:flex sm:flex-wrap sm:justify-between">
              <button className="flex items-center gap-2 text-[#2a2a2a] text-sm font-medium">
                Featured modules
                <ChevronDown className="h-4 w-4" strokeWidth={2} />
              </button>
              <div className="flex items-center gap-2 justify-end">
                <div className="relative hidden sm:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search a feature"
                    className="w-64 rounded-full bg-[#f3f4f0] pl-9 pr-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#7a8968]/30"
                  />
                </div>
                <button className="rounded-full bg-[#1a1a1a] text-white px-5 py-2.5 text-sm font-medium whitespace-nowrap">
                  Compare plans
                </button>
              </div>
            </div>

            {/* Feature grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.map((p) => (
                <div key={p.title} className="flex flex-col">
                  <div className="relative rounded-2xl overflow-hidden aspect-square bg-gray-100">
                    <img src={p.img} alt={p.title} loading="lazy" width={800} height={800} className="w-full h-full object-cover" />
                    {p.tag && (
                      <span className="absolute top-3 left-3 rounded-full bg-white/85 backdrop-blur px-3 py-1 text-[11px] text-gray-700">
                        {p.tag}
                      </span>
                    )}
                    <span className="absolute bottom-3 right-3 rounded-full bg-white/85 backdrop-blur px-3 py-1 text-[11px] text-gray-700 font-medium">
                      {p.code}
                    </span>
                  </div>
                  <div className="mt-3.5 px-0.5 flex flex-col flex-1">
                    <p className="text-[11px] text-gray-400 tracking-wide">{p.category}</p>
                    <h3 className="mt-1.5 text-[13px] leading-snug text-[#2a2a2a] font-medium line-clamp-2 min-h-[36px]">
                      {p.title}
                    </h3>
                    <div className="mt-auto pt-2 flex items-baseline gap-2">
                      <span className="text-[13px] font-semibold text-[#2a2a2a]">{p.meta}</span>
                      {p.status && <span className="text-[11px] text-gray-400">· {p.status}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Collapsible sections */}
            <div className="mt-6 divide-y divide-gray-100 border-t border-gray-100">
              <button className="w-full flex items-center justify-between gap-2 py-4 text-sm text-[#2a2a2a]">
                <span>Insurance, claims & payments</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>
              <button className="w-full flex items-center justify-between gap-2 py-4 text-sm text-[#2a2a2a]">
                <span>Multi-clinic, roles & audit log</span>
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

        {/* ============ TRUSTED BY STRIP ============ */}
        <section className="mt-6 rounded-[24px] bg-white px-6 sm:px-10 py-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <p className="text-[13px] text-gray-500 tracking-wide">
              Trusted by <span className="text-[#2a2a2a] font-medium">1,200+ clinics</span> across 14 countries
            </p>
            <div className="flex flex-wrap items-center gap-x-10 gap-y-3 text-gray-400">
              {["Northline Dental", "Marigold Care", "Rowan Family", "Ivory & Co.", "Peakview Ortho", "Baywood Smiles"].map((n) => (
                <span key={n} className="text-[15px] font-serif italic tracking-tight text-gray-500/90">{n}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ============ VALUE PILLARS (Stripe-style 3-up) ============ */}
        <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Zap, tag: "Operations", title: "One workspace, zero swivel-chair", body: "Front desk, dentists, hygienists and billing share the same real-time chart, schedule and ledger. No exports, no CSV shuffling, no double entry." },
            { icon: Shield, tag: "Trust", title: "HIPAA-ready by default", body: "Role-based access, per-clinic isolation, full audit log and encrypted storage. Every action is attributed to a person and a device." },
            { icon: Sparkles, tag: "Intelligence", title: "AI that assists, never replaces", body: "Dictate SOAP notes, extract insurance benefits from a scan, and explain treatment plans in plain language — all reviewed by your team." },
          ].map((p) => (
            <div key={p.title} className="rounded-[20px] bg-white p-6 lg:p-7">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-gray-500">
                <p.icon className="h-3.5 w-3.5" strokeWidth={2} />
                {p.tag}
              </div>
              <h3 className="mt-4 text-[22px] leading-[1.2] font-light tracking-tight text-[#1a1a1a]">{p.title}</h3>
              <p className="mt-3 text-[13.5px] leading-relaxed text-gray-600">{p.body}</p>
            </div>
          ))}
        </section>

        {/* ============ PRODUCT DEEP-DIVE: SCHEDULING ============ */}
        <section className="mt-6 rounded-[28px] bg-[#7a8968] p-6 sm:p-10 lg:p-14 text-white overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/70">01 · Scheduling</div>
              <h2 className="mt-4 text-4xl lg:text-5xl font-light leading-[1.05] tracking-tight">
                A schedule that <span className="font-serif italic">defends itself</span>.
              </h2>
              <p className="mt-5 text-white/80 text-[14px] leading-relaxed max-w-md">
                Chair-based grid, drag-to-reschedule, conflict guardrails, recurring recalls and a self-filling waitlist. When a slot opens, Enamel offers it to the next best patient — automatically.
              </p>
              <ul className="mt-6 space-y-2.5 text-[13px] text-white/85">
                {["Conflict detection across chairs, providers and rooms", "Waitlist auto-fill with SMS confirmation", "Recurring 6-month recalls with drift tolerance", "Chair utilization heatmap in Reports"].map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="h-4 w-4 mt-0.5 text-white/90" strokeWidth={2.2} />{f}</li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-7">
              <div className="rounded-2xl bg-white/95 text-[#1a1a1a] p-4 shadow-2xl">
                <div className="flex items-center justify-between text-[12px] text-gray-500 px-2 pb-3 border-b border-gray-100">
                  <span>Monday · Chair 3 · Dr. Okafor</span>
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Live</span>
                </div>
                <div className="grid grid-cols-[60px_1fr] gap-x-3 text-[12px] mt-3">
                  {[
                    { t: "09:00", label: "M. Chen · Cleaning", tone: "bg-[#eef0ec] border-l-2 border-[#7a8968]" },
                    { t: "09:45", label: "R. Patel · Filling #14", tone: "bg-amber-50 border-l-2 border-amber-500" },
                    { t: "10:30", label: "Open · waitlist offered", tone: "bg-gray-50 border-l-2 border-gray-300 text-gray-500" },
                    { t: "11:15", label: "J. Alvarez · Consult", tone: "bg-[#eef0ec] border-l-2 border-[#7a8968]" },
                    { t: "12:00", label: "S. Kim · Extraction #18", tone: "bg-rose-50 border-l-2 border-rose-400" },
                  ].map((row) => (
                    <div key={row.t} className="contents">
                      <div className="text-gray-400 pt-2">{row.t}</div>
                      <div className={`rounded-md px-3 py-2 mb-1.5 ${row.tone}`}>{row.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ PRODUCT DEEP-DIVE: CLINICAL (reverse) ============ */}
        <section className="mt-6 rounded-[28px] bg-white p-6 sm:p-10 lg:p-14 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 order-2 lg:order-1">
              <div className="rounded-2xl bg-[#f7f8f4] p-6">
                <div className="flex items-center justify-between text-[12px] text-gray-500 mb-4">
                  <span>Patient · Marta Chen · 34</span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px]">Penicillin allergy</span>
                </div>
                <div className="grid grid-cols-8 gap-1.5">
                  {Array.from({ length: 32 }).map((_, i) => {
                    const states = ["bg-white border-gray-200", "bg-white border-gray-200", "bg-amber-100 border-amber-300", "bg-white border-gray-200", "bg-rose-100 border-rose-300", "bg-white border-gray-200", "bg-white border-gray-200", "bg-[#7a8968]/20 border-[#7a8968]/40"];
                    return <div key={i} className={`aspect-square rounded-md border ${states[i % 8]}`} />;
                  })}
                </div>
                <div className="mt-5 rounded-lg bg-white p-4 border border-gray-100">
                  <div className="text-[11px] uppercase tracking-wide text-gray-400">Signed SOAP · today</div>
                  <p className="mt-2 text-[13px] text-gray-700 leading-relaxed">
                    <span className="font-medium">S:</span> Patient reports mild sensitivity on #14 to cold. <span className="font-medium">O:</span> Class II composite intact, no percussion pain. <span className="font-medium">A:</span> Dentinal hypersensitivity. <span className="font-medium">P:</span> Fluoride varnish applied; recall 3mo.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400">
                    <Lock className="h-3 w-3" /> Signed by Dr. Okafor · 2:14pm
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 order-1 lg:order-2">
              <div className="text-[11px] uppercase tracking-[0.16em] text-gray-500">02 · Clinical</div>
              <h2 className="mt-4 text-4xl lg:text-5xl font-light leading-[1.05] tracking-tight text-[#1a1a1a]">
                Charting that <span className="font-serif italic text-[#7a8968]">tells the whole story</span>.
              </h2>
              <p className="mt-5 text-gray-600 text-[14px] leading-relaxed max-w-md">
                Anatomical odontogram, treatment plans with clinic-specific fee schedules, medical alerts and signed SOAP notes — with AI dictation that respects your voice.
              </p>
              <ul className="mt-6 space-y-2.5 text-[13px] text-gray-700">
                {["Per-surface charting with condition & procedure layers", "Treatment plan phasing with patient/insurance split", "SOAP notes signed, versioned and immutable", "AI dictation with structured S/O/A/P sections"].map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="h-4 w-4 mt-0.5 text-[#7a8968]" strokeWidth={2.2} />{f}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ============ BILLING + COMMS 2-UP ============ */}
        <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-[24px] bg-white p-6 lg:p-8">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-gray-500">
              <CreditCard className="h-3.5 w-3.5" /> 03 · Billing & Insurance
            </div>
            <h3 className="mt-4 text-[26px] leading-[1.15] font-light tracking-tight text-[#1a1a1a]">
              From treatment plan to <span className="font-serif italic">paid claim</span>.
            </h3>
            <p className="mt-3 text-[13.5px] text-gray-600 leading-relaxed">
              Invoice ledger, ADA J400 claims, A/R aging and statement runs — all reading from the same clinical record. No re-keying, no reconciliation spreadsheets.
            </p>
            <div className="mt-5 rounded-xl bg-[#f7f8f4] p-4 text-[12px]">
              <div className="flex justify-between text-gray-500 pb-2 border-b border-gray-200">
                <span>A/R aging · 30 clinics</span><span>Total $184,220</span>
              </div>
              {[["0–30", 82, "#7a8968"], ["31–60", 42, "#c9b56a"], ["61–90", 24, "#e0996a"], ["90+", 11, "#c46a6a"]].map(([b, w, c]) => (
                <div key={b as string} className="flex items-center gap-3 mt-2.5">
                  <span className="w-14 text-gray-500">{b}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${w}%`, background: c as string }} />
                  </div>
                  <span className="w-10 text-right text-gray-700">{w}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] bg-[#1a1a1a] text-white p-6 lg:p-8">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/60">
              <MessageSquare className="h-3.5 w-3.5" /> 04 · Communications
            </div>
            <h3 className="mt-4 text-[26px] leading-[1.15] font-light tracking-tight">
              Conversations that <span className="font-serif italic text-[#c9d3b7]">stay in the chart</span>.
            </h3>
            <p className="mt-3 text-[13.5px] text-white/70 leading-relaxed">
              Two-way SMS and email with templates, delivery receipts and per-patient threads — linked to appointments, plans and invoices.
            </p>
            <div className="mt-5 space-y-2.5">
              {[
                { who: "Enamel", msg: "Hi Marta — confirming your cleaning Mon 9:00am. Reply Y to confirm.", muted: true },
                { who: "Marta", msg: "Y — see you then 🙂", muted: false },
                { who: "Enamel", msg: "Great. Directions & intake link: enml.co/i/8Kq", muted: true },
              ].map((m, i) => (
                <div key={i} className={`rounded-xl px-4 py-2.5 text-[12.5px] max-w-[85%] ${m.muted ? "bg-white/10 text-white/85" : "bg-[#c9d3b7] text-[#1a1a1a] ml-auto"}`}>
                  {m.msg}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ PRODUCT DEEP-DIVE: AI (reverse split, matches Clinical rhythm) ============ */}
        <section className="mt-6 rounded-[28px] bg-[#f7f8f4] p-6 sm:p-10 lg:p-14 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Copy column */}
            <div className="lg:col-span-5">
              <div className="text-[11px] uppercase tracking-[0.16em] text-gray-500">05 · Intelligence</div>
              <h2 className="mt-4 text-4xl lg:text-5xl font-light leading-[1.05] tracking-tight text-[#1a1a1a]">
                AI that <span className="font-serif italic text-[#7a8968]">writes what you said</span>, not what it guessed.
              </h2>
              <p className="mt-5 text-gray-600 text-[14px] leading-relaxed max-w-md">
                Dictate the visit in your own words. Enamel transcribes, structures it into a signed SOAP note, extracts insurance benefits from a scanned card, and rewrites treatment plans in plain language for the patient — every output cited, editable and reviewed before it lands in the chart.
              </p>
              <ul className="mt-6 space-y-2.5 text-[13px] text-gray-700">
                {[
                  "Voice → structured S / O / A / P in under 6 seconds",
                  "Benefits extraction from a scan (deductible, max, %)",
                  "Plain-language plan explainers, per patient reading level",
                  "Human-in-the-loop: every AI output is reviewed and signed",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-[#7a8968] shrink-0" strokeWidth={2.2} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-center gap-2 text-[11px] text-gray-500">
                <Shield className="h-3.5 w-3.5" strokeWidth={2} />
                No training on your patient data. HIPAA-scoped inference.
              </div>
            </div>

            {/* Story column: transcript → structured SOAP */}
            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Card 1: raw dictation */}
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span className="uppercase tracking-[0.14em]">Dictation · live</span>
                    <span className="flex items-center gap-1.5 text-[#7a8968]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#7a8968] animate-pulse" />
                      00:42
                    </span>
                  </div>
                  <div className="mt-4 space-y-1 text-[13px] text-gray-700 leading-relaxed">
                    <p>“Patient reports cold sensitivity on upper left, tooth fourteen, started about a week ago…”</p>
                    <p className="text-gray-400">“…class two composite still intact, no percussion pain, no swelling…”</p>
                    <p className="text-gray-300">“…applying fluoride varnish, recall in three months.”</p>
                  </div>
                  <div className="mt-5 flex items-center gap-1.5">
                    {[3, 6, 4, 8, 5, 9, 6, 7, 5, 8, 4, 6, 3, 7, 5, 6].map((h, i) => (
                      <span key={i} className="w-1 rounded-full bg-[#7a8968]/60" style={{ height: `${h * 2}px` }} />
                    ))}
                    <span className="ml-3 text-[11px] text-gray-400">Transcribing…</span>
                  </div>
                </div>

                {/* Card 2: structured output */}
                <div className="rounded-2xl bg-[#1a1a1a] text-white p-5 shadow-sm">
                  <div className="flex items-center justify-between text-[11px] text-white/50">
                    <span className="uppercase tracking-[0.14em]">Structured SOAP · draft</span>
                    <span className="flex items-center gap-1 text-[#c9d3b7]">
                      <Sparkles className="h-3 w-3" strokeWidth={2} /> AI
                    </span>
                  </div>
                  <dl className="mt-4 space-y-2.5 text-[12.5px] leading-relaxed">
                    {[
                      ["S", "Cold sensitivity, tooth #14, 1 week."],
                      ["O", "Class II composite intact. No percussion pain, no swelling."],
                      ["A", "Dentinal hypersensitivity."],
                      ["P", "Fluoride varnish 5%. Recall 3 months."],
                    ].map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[20px_1fr] gap-3">
                        <dt className="text-[#c9d3b7] font-medium">{k}</dt>
                        <dd className="text-white/85">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-[11px]">
                    <span className="text-white/50">Awaiting Dr. Okafor review</span>
                    <span className="rounded-full bg-[#c9d3b7] text-[#1a1a1a] px-2.5 py-1 font-medium">Sign & post</span>
                  </div>
                </div>

                {/* Card 3: benefits extraction (spans full width) */}
                <div className="md:col-span-2 rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-gray-400">Benefits extraction · Delta PPO card</div>
                    <span className="text-[11px] text-gray-400">2.3s · 4 fields</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { k: "Annual max", v: "$1,500" },
                      { k: "Deductible", v: "$50" },
                      { k: "Preventive", v: "100%" },
                      { k: "Major", v: "50%" },
                    ].map((s) => (
                      <div key={s.k} className="rounded-lg bg-[#f7f8f4] px-3 py-2.5">
                        <div className="text-[10.5px] uppercase tracking-wide text-gray-400">{s.k}</div>
                        <div className="mt-0.5 text-[15px] font-medium text-[#1a1a1a]">{s.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>



        {/* ============ STATS BAND ============ */}
        <section className="mt-6 rounded-[24px] bg-[#eef0ec] border border-[#dfe3d8] p-6 sm:p-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { k: "38%", v: "fewer no-shows with recall + SMS reminders" },
              { k: "2.1h", v: "saved per clinician per week on notes" },
              { k: "11 days", v: "faster claim-to-payment cycle" },
              { k: "99.98%", v: "uptime across regions in the last 12mo" },
            ].map((s) => (
              <div key={s.k}>
                <div className="text-4xl lg:text-5xl font-light tracking-tight text-[#1a1a1a]">{s.k}</div>
                <p className="mt-2 text-[13px] text-gray-600 max-w-[220px] leading-snug">{s.v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ WORKFLOW / HOW IT FITS (Linear-style connected steps) ============ */}
        <section className="mt-6 rounded-[24px] bg-white p-6 sm:p-10 lg:p-14">
          <div className="max-w-2xl">
            <div className="text-[11px] uppercase tracking-[0.16em] text-gray-500">A day in the clinic</div>
            <h2 className="mt-3 text-4xl lg:text-5xl font-light leading-[1.05] tracking-tight text-[#1a1a1a]">
              One thread from <span className="font-serif italic text-[#7a8968]">booking to payout</span>.
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { i: CalendarDays, t: "Book", d: "Patient books online or front desk fits them in." },
              { i: FileText, t: "Intake", d: "Digital forms sync to the chart before arrival." },
              { i: Stethoscope, t: "Treat", d: "Chart, plan and dictate — signed on the spot." },
              { i: Receipt, t: "Bill", d: "Invoice + claim generated from the plan." },
              { i: TrendingUp, t: "Report", d: "AR, production and recall in one dashboard." },
            ].map((s, i) => (
              <div key={s.t} className="relative rounded-2xl border border-gray-100 p-5 bg-[#fafbf8]">
                <div className="flex items-center justify-between">
                  <s.i className="h-5 w-5 text-[#7a8968]" strokeWidth={1.8} />
                  <span className="text-[11px] text-gray-400">0{i + 1}</span>
                </div>
                <div className="mt-6 text-[15px] font-medium text-[#1a1a1a]">{s.t}</div>
                <p className="mt-1.5 text-[12.5px] text-gray-500 leading-snug">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ TESTIMONIAL ============ */}
        <section className="mt-6 rounded-[28px] bg-[#7a8968] p-8 sm:p-12 lg:p-16 text-white">
          <div className="max-w-3xl">
            <div className="flex items-center gap-1 text-white/90">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-white/90" strokeWidth={0} />)}
            </div>
            <blockquote className="mt-6 text-2xl sm:text-3xl lg:text-[38px] leading-[1.2] font-light tracking-tight">
              <span className="font-serif italic">“We replaced four tools with Enamel.</span> The schedule, chart and ledger finally speak to each other — our front desk got their afternoons back and our AR dropped by a third in the first quarter.”
            </blockquote>
            <div className="mt-8 flex items-center gap-4">
              <div className="h-11 w-11 rounded-full overflow-hidden ring-2 ring-white/40">
                <img src={avatarImg} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="text-sm">
                <div className="font-medium">Dr. Adaeze Okafor</div>
                <div className="text-white/70">Clinical lead · Northline Dental, 3 locations</div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ PRICING PREVIEW ============ */}
        <section className="mt-6 rounded-[24px] bg-white p-6 sm:p-10 lg:p-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-gray-500">Pricing</div>
              <h2 className="mt-3 text-3xl lg:text-4xl font-light tracking-tight text-[#1a1a1a]">Simple, per-clinic pricing.</h2>
            </div>
            <p className="text-[13px] text-gray-500 max-w-sm">Every plan includes unlimited users, HIPAA-ready storage and the full clinical suite. Pay per active clinic.</p>
          </div>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "Solo", price: "$149", per: "/clinic / month", desc: "For single-chair and solo practitioners.", feats: ["1 clinic", "Up to 3 chairs", "Scheduling + charting", "Email support"], cta: "Start free", dark: false },
              { name: "Practice", price: "$349", per: "/clinic / month", desc: "For growing clinics that bill insurance.", feats: ["1 clinic", "Unlimited chairs", "Billing + ADA claims", "AI dictation", "Priority support"], cta: "Start free", dark: true },
              { name: "Group", price: "Talk to us", per: "", desc: "For multi-location DSOs and groups.", feats: ["Multi-clinic + org roles", "Cross-clinic reporting", "SSO + audit exports", "Dedicated success"], cta: "Contact sales", dark: false },
            ].map((p) => (
              <div key={p.name} className={`rounded-2xl p-6 lg:p-7 ${p.dark ? "bg-[#1a1a1a] text-white" : "bg-[#f7f8f4] text-[#1a1a1a]"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{p.name}</span>
                  {p.dark && <span className="rounded-full bg-[#c9d3b7] text-[#1a1a1a] text-[10px] px-2 py-0.5 uppercase tracking-wide">Popular</span>}
                </div>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-light tracking-tight">{p.price}</span>
                  <span className={`text-[12px] ${p.dark ? "text-white/60" : "text-gray-500"}`}>{p.per}</span>
                </div>
                <p className={`mt-2 text-[13px] ${p.dark ? "text-white/70" : "text-gray-600"}`}>{p.desc}</p>
                <ul className="mt-5 space-y-2 text-[13px]">
                  {p.feats.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className={`h-4 w-4 mt-0.5 ${p.dark ? "text-[#c9d3b7]" : "text-[#7a8968]"}`} strokeWidth={2.2} />
                      <span className={p.dark ? "text-white/85" : "text-gray-700"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button className={`mt-6 w-full rounded-full px-4 py-2.5 text-sm font-medium ${p.dark ? "bg-white text-[#1a1a1a]" : "bg-[#1a1a1a] text-white"}`}>
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section className="mt-6 rounded-[24px] bg-white p-6 sm:p-10 lg:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-gray-500">FAQ</div>
              <h2 className="mt-3 text-3xl lg:text-4xl font-light tracking-tight text-[#1a1a1a]">
                Questions clinics actually ask.
              </h2>
              <p className="mt-4 text-[13px] text-gray-500 max-w-xs">Can't find yours? Talk to our clinical team — most of us have run front desks or ops before.</p>
            </div>
            <div className="lg:col-span-8 divide-y divide-gray-100 border-t border-gray-100">
              {[
                { q: "How long does migration from our current PMS take?", a: "Most single-location clinics migrate patients, appointments and ledger balances in 5–10 business days. We handle the import; you verify a sample." },
                { q: "Is Enamel HIPAA-compliant?", a: "Yes. Data is encrypted in transit and at rest, access is role-scoped per clinic, every mutation is audit-logged, and we sign BAAs on Practice and Group plans." },
                { q: "Can we run multiple locations under one org?", a: "Group plans support unlimited clinics under a single organization with cross-clinic roles, shared reporting and per-clinic isolation of PHI." },
                { q: "Do you support insurance claims and eligibility?", a: "We generate ADA J400 claims from treatment plans and produce statements + A/R aging. Real-time eligibility integrations are on Practice and Group." },
                { q: "What happens to our data if we leave?", a: "You own it. Export patients, charts, notes and ledger to CSV/PDF at any time — no lock-in, no exit fees." },
              ].map((f) => (
                <details key={f.q} className="group py-5">
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                    <span className="text-[15px] text-[#1a1a1a]">{f.q}</span>
                    <ChevronDown className="h-4 w-4 text-gray-400 transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-[13.5px] text-gray-600 leading-relaxed max-w-2xl">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ============ CTA ============ */}
        <section className="mt-6 rounded-[28px] bg-[#1a1a1a] text-white p-10 sm:p-14 lg:p-20 relative overflow-hidden">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#7a8968]/40 blur-3xl" />
          <div className="relative max-w-3xl">
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/60">Get started</div>
            <h2 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-[1.05]">
              Give your team a <span className="font-serif italic text-[#c9d3b7]">calmer</span> workday.
            </h2>
            <p className="mt-5 text-white/75 text-[14px] leading-relaxed max-w-lg">
              14-day free trial. No credit card. Your data stays yours — importable and exportable from day one.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/auth" className="rounded-full bg-white text-[#1a1a1a] px-6 py-3 text-sm font-medium inline-flex items-center gap-2">
                Start free trial <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/book" className="rounded-full border border-white/20 text-white px-6 py-3 text-sm font-medium hover:bg-white/5">
                Book a live demo
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-white/50">
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> HIPAA-ready</span>
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Unlimited users</span>
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> 10-day migration</span>
              <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> 99.98% uptime</span>
            </div>
          </div>
        </section>

        {/* ============ FOOTER ============ */}
        <footer className="mt-6 rounded-[24px] bg-white px-6 sm:px-10 py-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2 text-[#1a1a1a] text-2xl font-serif italic tracking-tight">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#7a8968]" />
                enamel<span>.</span>
              </div>
              <p className="mt-3 text-[13px] text-gray-500 max-w-xs">The calm operating system for modern dental clinics.</p>
            </div>
            {[
              { h: "Product", items: ["Scheduling", "Clinical", "Billing", "Communications", "AI"] },
              { h: "Company", items: ["About", "Customers", "Security", "Contact"] },
              { h: "Resources", items: ["Docs", "Changelog", "Status", "Privacy"] },
            ].map((c) => (
              <div key={c.h}>
                <div className="text-[11px] uppercase tracking-[0.14em] text-gray-400">{c.h}</div>
                <ul className="mt-3 space-y-2 text-[13px] text-gray-700">
                  {c.items.map((i) => <li key={i}><a href="#" className="hover:text-[#7a8968]">{i}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-[12px] text-gray-500">
            <span>© {new Date().getFullYear()} Enamel — built for dental teams</span>
            <span>Made with care · SOC 2 in progress · HIPAA-ready</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

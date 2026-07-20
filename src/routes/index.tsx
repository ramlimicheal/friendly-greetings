import { createFileRoute } from "@tanstack/react-router";
import { Home, Store, Package, Sparkles, Wrench, Search, ChevronDown } from "lucide-react";
import heroImg from "@/assets/landing-hero.jpg";
import card1 from "@/assets/landing-card-1.jpg";
import card2 from "@/assets/landing-card-2.jpg";
import card3 from "@/assets/landing-card-3.jpg";
import card4 from "@/assets/landing-card-4.jpg";
import avatarImg from "@/assets/landing-avatar.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "m. — Enter the digital bazaar" },
      { name: "description", content: "Celebrate convenience, embrace choice, and experience seamless shopping in the digital bazaar." },
    ],
  }),
  component: LandingPage,
});

const navItems = [
  { label: "Home", icon: Home, active: true },
  { label: "Life store", icon: Store },
  { label: "Products", icon: Package },
  { label: "Inspiration", icon: Sparkles },
  { label: "Service", icon: Wrench },
];

const products = [
  {
    img: card1,
    cfn: "CFN-#54dv4",
    tag: null,
    category: "district version / featured",
    title: 'Ochar distict shirt, hallft light wight- Godji black and orange" g7',
    price: "$39.09",
    status: "PNL-Sold out",
  },
  {
    img: card2,
    cfn: "CFN-#7f66d",
    tag: "recycled",
    category: "new balance / offers",
    title: "Combo hooded open sweter- White and grey",
    price: "$13.13",
    status: "",
  },
  {
    img: card3,
    cfn: "CFN-#653dv5",
    tag: null,
    category: "district version / latest",
    title: "Women DV- NB twin layered recycled Midweight Jacket- Clay Pink",
    price: "$116.44",
    status: "PNL-Sold out",
  },
  {
    img: card4,
    cfn: "CPR-#44adk",
    tag: "at featured",
    category: "nike / latest",
    title: "Man adizero nike pro 3-preloved scalted/Aura soft-orange T shirt",
    price: "$56.08",
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
            <div className="text-white text-3xl font-serif italic tracking-tight">m<span className="text-white">.</span></div>

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

            <div className="flex items-center gap-2">
              <div className="h-11 w-11 rounded-full overflow-hidden ring-2 ring-white/40">
                <img src={avatarImg} alt="Account" className="h-full w-full object-cover" />
              </div>
            </div>
          </div>

          {/* Hero content */}
          <div className="relative mt-10 lg:mt-14 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <h1 className="lg:col-span-8 text-white text-4xl sm:text-5xl lg:text-6xl leading-[1.05] font-light tracking-tight max-w-3xl">
              Enter the digital bazaar, where every<br className="hidden sm:block" /> click leads to excitement
            </h1>
            <p className="lg:col-span-4 text-white/85 text-sm leading-relaxed max-w-xs lg:mt-3">
              Celebrate convenience, embrace choice, and experience seamless shopping with us! discover a world where every click leads to excitement.
            </p>
          </div>

          {/* Hero image */}
          <div className="relative mt-8 h-[220px] sm:h-[280px] lg:h-[320px] rounded-2xl overflow-hidden">
            <img src={heroImg} alt="Hero" className="w-full h-full object-cover object-center opacity-90 mix-blend-luminosity" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#7a8968]/40 via-transparent to-[#7a8968]/60" />
          </div>

          {/* Filter row */}
          <div className="relative -mt-8 flex flex-wrap items-center justify-between gap-4 px-2">
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded-full bg-white text-[#2a2a2a] px-5 py-2.5 text-sm font-medium shadow-sm">
                Product categories
              </button>
              <button className="text-white/90 text-sm px-3 py-2 hover:text-white">Men</button>
              <button className="text-white/90 text-sm px-3 py-2 hover:text-white">Women</button>
              <button className="text-white/90 text-sm px-3 py-2 hover:text-white">Accessories</button>
              <button className="text-white/90 text-sm px-3 py-2 hover:text-white">Sales</button>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-full bg-white text-[#2a2a2a] px-5 py-2.5 text-sm font-medium shadow-sm">
                Go to lifestore
              </button>
              <button className="rounded-full bg-white text-[#2a2a2a] px-5 py-2.5 text-sm font-medium shadow-sm">
                Request new products
              </button>
            </div>
          </div>

          {/* White product panel */}
          <div className="mt-6 rounded-[24px] bg-white p-5 sm:p-6 lg:p-7 shadow-xl">
            {/* Panel header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <button className="flex items-center gap-2 text-[#2a2a2a] text-sm font-medium">
                Featured clothing
                <ChevronDown className="h-4 w-4" strokeWidth={2} />
              </button>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search"
                    className="w-64 rounded-full bg-[#f3f4f0] pl-9 pr-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#7a8968]/30"
                  />
                </div>
                <button className="rounded-full bg-[#1a1a1a] text-white px-5 py-2.5 text-sm font-medium">
                  Filters
                </button>
              </div>
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {products.map((p) => (
                <div key={p.title} className="flex flex-col">
                  <div className="relative rounded-2xl overflow-hidden aspect-[4/5] bg-gray-100">
                    <img src={p.img} alt={p.title} loading="lazy" className="w-full h-full object-cover" />
                    {p.tag && (
                      <span className="absolute top-3 left-3 rounded-full bg-white/85 backdrop-blur px-3 py-1 text-[11px] text-gray-700">
                        {p.tag}
                      </span>
                    )}
                    <span className="absolute bottom-3 right-3 rounded-full bg-white/85 backdrop-blur px-3 py-1 text-[11px] text-gray-700 font-medium">
                      {p.cfn}
                    </span>
                  </div>
                  <div className="mt-3 px-1">
                    <p className="text-[11px] text-gray-400 tracking-wide">{p.category}</p>
                    <h3 className="mt-1.5 text-[13px] leading-snug text-[#2a2a2a] font-medium line-clamp-2 min-h-[38px]">
                      {p.title}
                    </h3>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-[13px] font-semibold text-[#2a2a2a]">{p.price}</span>
                      {p.status && <span className="text-[11px] text-gray-400">{p.status}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Collapsible sections */}
            <div className="mt-6 divide-y divide-gray-100 border-t border-gray-100">
              <button className="w-full flex items-center gap-2 py-4 text-sm text-[#2a2a2a]">
                Shoes and sandals
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>
              <button className="w-full flex items-center gap-2 py-4 text-sm text-[#2a2a2a]">
                Shop classics
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

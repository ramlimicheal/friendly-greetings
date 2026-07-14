// Central mock data for the Enamel dental clinic app.

export type Patient = {
  id: string;
  chartNo: string;
  name: string;
  initials: string;
  age: number;
  sex: "F" | "M";
  phone: string;
  email: string;
  insurance: string;
  lastVisit: string;
  nextVisit: string | null;
  status: "Active" | "Recall" | "Overdue" | "New";
  balance: number;
  allergies: string[];
  primaryDentist: string;
  address: string;
  notes: string;
};

export const patients: Patient[] = [
  {
    id: "p-1024",
    chartNo: "EN-1024",
    name: "Amelia Chen",
    initials: "AC",
    age: 32,
    sex: "F",
    phone: "(415) 555-0138",
    email: "amelia.chen@example.com",
    insurance: "Delta PPO",
    lastVisit: "Oct 02, 2025",
    nextVisit: "Nov 12, 2025",
    status: "Active",
    balance: 0,
    allergies: ["Penicillin"],
    primaryDentist: "Dr. Rina Okafor",
    address: "224 Fillmore St, San Francisco, CA",
    notes: "Prefers morning appointments. Sensitive to cold on #14.",
  },
  {
    id: "p-1025",
    chartNo: "EN-1025",
    name: "Marcus Delaney",
    initials: "MD",
    age: 45,
    sex: "M",
    phone: "(415) 555-0192",
    email: "m.delaney@example.com",
    insurance: "Cigna",
    lastVisit: "Sep 18, 2025",
    nextVisit: "Oct 22, 2025",
    status: "Active",
    balance: 240,
    allergies: [],
    primaryDentist: "Dr. Kai Tanaka",
    address: "88 Hayes St, San Francisco, CA",
    notes: "Ongoing implant planning — site #30.",
  },
  {
    id: "p-1026",
    chartNo: "EN-1026",
    name: "Sofia Alvarez",
    initials: "SA",
    age: 27,
    sex: "F",
    phone: "(415) 555-0110",
    email: "sofia.a@example.com",
    insurance: "Self-pay",
    lastVisit: "Aug 05, 2025",
    nextVisit: null,
    status: "Recall",
    balance: 0,
    allergies: ["Latex"],
    primaryDentist: "Dr. Rina Okafor",
    address: "17 Divisadero St, San Francisco, CA",
    notes: "Whitening trays ordered.",
  },
  {
    id: "p-1027",
    chartNo: "EN-1027",
    name: "James Wong",
    initials: "JW",
    age: 61,
    sex: "M",
    phone: "(415) 555-0177",
    email: "j.wong@example.com",
    insurance: "MetLife",
    lastVisit: "Jul 12, 2025",
    nextVisit: null,
    status: "Overdue",
    balance: 480,
    allergies: [],
    primaryDentist: "Dr. Kai Tanaka",
    address: "902 Post St, San Francisco, CA",
    notes: "Perio maintenance every 3 months.",
  },
  {
    id: "p-1028",
    chartNo: "EN-1028",
    name: "Priya Natarajan",
    initials: "PN",
    age: 38,
    sex: "F",
    phone: "(415) 555-0164",
    email: "priya.n@example.com",
    insurance: "Aetna",
    lastVisit: "Oct 10, 2025",
    nextVisit: "Oct 24, 2025",
    status: "Active",
    balance: 0,
    allergies: ["Sulfa"],
    primaryDentist: "Dr. Rina Okafor",
    address: "3312 Union St, San Francisco, CA",
    notes: "Invisalign — tray 12 of 22.",
  },
  {
    id: "p-1029",
    chartNo: "EN-1029",
    name: "Ethan Brooks",
    initials: "EB",
    age: 12,
    sex: "M",
    phone: "(415) 555-0121",
    email: "guardian.brooks@example.com",
    insurance: "Delta PPO",
    lastVisit: "Oct 07, 2025",
    nextVisit: "Apr 07, 2026",
    status: "Active",
    balance: 0,
    allergies: [],
    primaryDentist: "Dr. Rina Okafor",
    address: "556 Sanchez St, San Francisco, CA",
    notes: "Pediatric — orthodontic consult scheduled.",
  },
  {
    id: "p-1030",
    chartNo: "EN-1030",
    name: "Naomi Field",
    initials: "NF",
    age: 54,
    sex: "F",
    phone: "(415) 555-0155",
    email: "n.field@example.com",
    insurance: "Cigna",
    lastVisit: "Sep 22, 2025",
    nextVisit: "Nov 03, 2025",
    status: "New",
    balance: 0,
    allergies: [],
    primaryDentist: "Dr. Kai Tanaka",
    address: "77 Church St, San Francisco, CA",
    notes: "Comprehensive exam completed, treatment plan pending.",
  },
  {
    id: "p-1031",
    chartNo: "EN-1031",
    name: "Oliver Park",
    initials: "OP",
    age: 41,
    sex: "M",
    phone: "(415) 555-0102",
    email: "o.park@example.com",
    insurance: "MetLife",
    lastVisit: "Oct 11, 2025",
    nextVisit: "Oct 18, 2025",
    status: "Active",
    balance: 120,
    allergies: [],
    primaryDentist: "Dr. Rina Okafor",
    address: "141 Steiner St, San Francisco, CA",
    notes: "Nightguard fitting follow-up.",
  },
];

export const staff = [
  { id: "s-1", name: "Dr. Rina Okafor", role: "Lead Dentist", initials: "RO", color: "bg-primary" },
  { id: "s-2", name: "Dr. Kai Tanaka", role: "Dentist", initials: "KT", color: "bg-emerald-500" },
  { id: "s-3", name: "Nadia Rossi", role: "Hygienist", initials: "NR", color: "bg-teal-500" },
  { id: "s-4", name: "Leo Martins", role: "Hygienist", initials: "LM", color: "bg-cyan-500" },
];

export type Appointment = {
  id: string;
  patientId: string;
  patient: string;
  procedure: string;
  provider: string;
  chair: 1 | 2 | 3 | 4;
  start: string; // ISO time "HH:MM"
  duration: number; // minutes
  status: "confirmed" | "arrived" | "in-chair" | "unconfirmed";
};

export const todaysAppointments: Appointment[] = [
  { id: "a1", patientId: "p-1024", patient: "Amelia Chen", procedure: "Cleaning + Exam", provider: "Nadia Rossi", chair: 1, start: "08:00", duration: 60, status: "confirmed" },
  { id: "a2", patientId: "p-1028", patient: "Priya Natarajan", procedure: "Invisalign check", provider: "Dr. Rina Okafor", chair: 2, start: "08:30", duration: 30, status: "arrived" },
  { id: "a3", patientId: "p-1025", patient: "Marcus Delaney", procedure: "Implant consult", provider: "Dr. Kai Tanaka", chair: 3, start: "09:00", duration: 60, status: "in-chair" },
  { id: "a4", patientId: "p-1031", patient: "Oliver Park", procedure: "Nightguard fit", provider: "Dr. Rina Okafor", chair: 2, start: "09:30", duration: 45, status: "confirmed" },
  { id: "a5", patientId: "p-1029", patient: "Ethan Brooks", procedure: "Pediatric exam", provider: "Dr. Rina Okafor", chair: 1, start: "10:00", duration: 30, status: "confirmed" },
  { id: "a6", patientId: "p-1027", patient: "James Wong", procedure: "Perio maintenance", provider: "Leo Martins", chair: 4, start: "10:30", duration: 60, status: "unconfirmed" },
  { id: "a7", patientId: "p-1026", patient: "Sofia Alvarez", procedure: "Whitening delivery", provider: "Nadia Rossi", chair: 1, start: "11:00", duration: 30, status: "confirmed" },
  { id: "a8", patientId: "p-1030", patient: "Naomi Field", procedure: "Treatment planning", provider: "Dr. Kai Tanaka", chair: 3, start: "11:30", duration: 45, status: "arrived" },
  { id: "a9", patientId: "p-1025", patient: "Marcus Delaney", procedure: "Crown seat #30", provider: "Dr. Kai Tanaka", chair: 3, start: "13:00", duration: 90, status: "confirmed" },
  { id: "a10", patientId: "p-1024", patient: "Amelia Chen", procedure: "Composite #14", provider: "Dr. Rina Okafor", chair: 2, start: "13:30", duration: 60, status: "confirmed" },
  { id: "a11", patientId: "p-1028", patient: "Priya Natarajan", procedure: "New aligners", provider: "Nadia Rossi", chair: 1, start: "14:00", duration: 30, status: "confirmed" },
  { id: "a12", patientId: "p-1031", patient: "Oliver Park", procedure: "Cleaning", provider: "Leo Martins", chair: 4, start: "14:30", duration: 45, status: "confirmed" },
  { id: "a13", patientId: "p-1027", patient: "James Wong", procedure: "Scaling & root planing", provider: "Leo Martins", chair: 4, start: "15:30", duration: 90, status: "confirmed" },
  { id: "a14", patientId: "p-1030", patient: "Naomi Field", procedure: "Extraction #17", provider: "Dr. Kai Tanaka", chair: 3, start: "16:00", duration: 60, status: "confirmed" },
];

export type ToothCondition =
  | "healthy"
  | "caries"
  | "filled"
  | "crown"
  | "implant"
  | "missing"
  | "root-canal";

export const toothChart: Record<number, ToothCondition> = {
  1: "missing", 2: "healthy", 3: "filled", 4: "healthy", 5: "healthy", 6: "healthy",
  7: "healthy", 8: "healthy", 9: "healthy", 10: "healthy", 11: "healthy", 12: "healthy",
  13: "caries", 14: "filled", 15: "healthy", 16: "missing",
  17: "missing", 18: "healthy", 19: "crown", 20: "healthy", 21: "healthy", 22: "healthy",
  23: "healthy", 24: "healthy", 25: "healthy", 26: "healthy", 27: "healthy", 28: "healthy",
  29: "root-canal", 30: "implant", 31: "healthy", 32: "missing",
};

export const treatmentCatalog = [
  { code: "D0120", name: "Periodic oral evaluation", category: "Diagnostic", fee: 65, duration: 15 },
  { code: "D0210", name: "Full mouth X-rays", category: "Diagnostic", fee: 145, duration: 20 },
  { code: "D1110", name: "Adult prophylaxis (cleaning)", category: "Preventive", fee: 120, duration: 45 },
  { code: "D1120", name: "Child prophylaxis", category: "Preventive", fee: 85, duration: 30 },
  { code: "D2391", name: "Composite — 1 surface", category: "Restorative", fee: 220, duration: 45 },
  { code: "D2740", name: "Crown — porcelain", category: "Restorative", fee: 1450, duration: 90 },
  { code: "D3310", name: "Root canal — anterior", category: "Endodontics", fee: 950, duration: 75 },
  { code: "D4341", name: "Scaling & root planing — 4+ teeth", category: "Periodontics", fee: 285, duration: 60 },
  { code: "D6010", name: "Implant — endosteal", category: "Implants", fee: 2200, duration: 120 },
  { code: "D7140", name: "Extraction — erupted tooth", category: "Oral Surgery", fee: 210, duration: 30 },
  { code: "D8080", name: "Comprehensive ortho — adolescent", category: "Orthodontics", fee: 5200, duration: 60 },
  { code: "D9944", name: "Occlusal guard — hard", category: "Adjunctive", fee: 585, duration: 30 },
];

export type Invoice = {
  id: string;
  patientId: string;
  patient: string;
  date: string;
  items: string;
  amount: number;
  status: "Paid" | "Pending" | "Overdue" | "Partial";
  method: string;
};

export const invoices: Invoice[] = [
  { id: "INV-2048", patientId: "p-1024", patient: "Amelia Chen", date: "Oct 12, 2025", items: "Cleaning + Exam + X-ray", amount: 285, status: "Paid", method: "Delta PPO" },
  { id: "INV-2049", patientId: "p-1025", patient: "Marcus Delaney", date: "Oct 12, 2025", items: "Implant consult + CBCT", amount: 340, status: "Partial", method: "Cigna" },
  { id: "INV-2050", patientId: "p-1027", patient: "James Wong", date: "Oct 11, 2025", items: "Perio maintenance", amount: 195, status: "Overdue", method: "MetLife" },
  { id: "INV-2051", patientId: "p-1028", patient: "Priya Natarajan", date: "Oct 10, 2025", items: "Invisalign tray refinement", amount: 480, status: "Paid", method: "Aetna" },
  { id: "INV-2052", patientId: "p-1031", patient: "Oliver Park", date: "Oct 10, 2025", items: "Nightguard — hard", amount: 585, status: "Pending", method: "MetLife" },
  { id: "INV-2053", patientId: "p-1030", patient: "Naomi Field", date: "Oct 09, 2025", items: "Comprehensive exam", amount: 210, status: "Paid", method: "Cigna" },
  { id: "INV-2054", patientId: "p-1026", patient: "Sofia Alvarez", date: "Oct 08, 2025", items: "Whitening trays", amount: 350, status: "Paid", method: "Self-pay" },
  { id: "INV-2055", patientId: "p-1029", patient: "Ethan Brooks", date: "Oct 07, 2025", items: "Pediatric cleaning", amount: 120, status: "Paid", method: "Delta PPO" },
];

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  onHand: number;
  reorderAt: number;
  unit: string;
  supplier: string;
  updated: string;
};

export const inventory: InventoryItem[] = [
  { id: "i-1", name: "Composite resin A2 (4g)", category: "Restorative", onHand: 24, reorderAt: 10, unit: "syringe", supplier: "Henry Schein", updated: "Oct 09" },
  { id: "i-2", name: "Nitrile gloves — M", category: "PPE", onHand: 6, reorderAt: 12, unit: "box (100)", supplier: "Patterson", updated: "Oct 11" },
  { id: "i-3", name: "Lidocaine 2% carpules", category: "Anesthetic", onHand: 82, reorderAt: 40, unit: "carpule", supplier: "Benco", updated: "Oct 08" },
  { id: "i-4", name: "PVS impression — light body", category: "Impression", onHand: 3, reorderAt: 6, unit: "cartridge", supplier: "3M", updated: "Oct 10" },
  { id: "i-5", name: "Endo files 21mm assorted", category: "Endodontics", onHand: 14, reorderAt: 8, unit: "pack", supplier: "Dentsply", updated: "Oct 06" },
  { id: "i-6", name: "Prophy paste — mint", category: "Preventive", onHand: 48, reorderAt: 20, unit: "cup", supplier: "Henry Schein", updated: "Oct 12" },
  { id: "i-7", name: "Fluoride varnish 5%", category: "Preventive", onHand: 9, reorderAt: 15, unit: "unit-dose", supplier: "Colgate Pro", updated: "Oct 11" },
  { id: "i-8", name: "Sterilization pouches 3.5x9", category: "Sterilization", onHand: 320, reorderAt: 200, unit: "pouch", supplier: "Crosstex", updated: "Oct 05" },
];

export const revenueLast30 = [
  4200, 3800, 5100, 4700, 3900, 6200, 5400, 4800, 5700, 6100,
  4500, 5200, 5900, 6300, 4900, 5600, 6100, 7000, 5800, 6400,
  6900, 5300, 6100, 6700, 7100, 6600, 7200, 6900, 7400, 7100,
];

export const chairUtilization = [
  { chair: "Chair 1", pct: 82 },
  { chair: "Chair 2", pct: 74 },
  { chair: "Chair 3", pct: 91 },
  { chair: "Chair 4", pct: 63 },
];

export const procedureMix = [
  { label: "Preventive", pct: 34, tone: "bg-primary" },
  { label: "Restorative", pct: 26, tone: "bg-emerald-500" },
  { label: "Endo", pct: 12, tone: "bg-teal-500" },
  { label: "Perio", pct: 10, tone: "bg-cyan-500" },
  { label: "Implants", pct: 9, tone: "bg-amber-500" },
  { label: "Ortho", pct: 6, tone: "bg-rose-400" },
  { label: "Other", pct: 3, tone: "bg-muted-foreground/40" },
];

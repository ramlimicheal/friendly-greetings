import type { ClinicRole } from "@/hooks/use-clinic";

export type Permission =
  | "staff.manage"
  | "clinic.settings"
  | "patients.view"
  | "patients.edit"
  | "clinical.view"
  | "clinical.edit"
  | "clinical.sign"
  | "schedule.view"
  | "schedule.edit"
  | "bookings.manage"
  | "billing.view"
  | "billing.manage"
  | "claims.manage"
  | "reports.view"
  | "reports.viewOwn"
  | "audit.view"
  | "data.export"
  | "inventory.manage"
  | "waitlist.manage"
  | "recalls.manage";

// Full read-only permissions the auditor role always has.
const READ_ONLY: Permission[] = [
  "patients.view",
  "clinical.view",
  "schedule.view",
  "billing.view",
  "reports.view",
  "audit.view",
];

const MATRIX: Record<ClinicRole, Permission[]> = {
  owner: [
    "staff.manage",
    "clinic.settings",
    "patients.view",
    "patients.edit",
    "clinical.view",
    "clinical.edit",
    "clinical.sign",
    "schedule.view",
    "schedule.edit",
    "bookings.manage",
    "billing.view",
    "billing.manage",
    "claims.manage",
    "reports.view",
    "audit.view",
    "data.export",
    "inventory.manage",
    "waitlist.manage",
    "recalls.manage",
  ],
  admin: [
    "staff.manage",
    "clinic.settings",
    "patients.view",
    "patients.edit",
    "clinical.view",
    "clinical.edit",
    "clinical.sign",
    "schedule.view",
    "schedule.edit",
    "bookings.manage",
    "billing.view",
    "billing.manage",
    "claims.manage",
    "reports.view",
    "audit.view",
    "data.export",
    "inventory.manage",
    "waitlist.manage",
    "recalls.manage",
  ],
  dentist: [
    "patients.view",
    "patients.edit",
    "clinical.view",
    "clinical.edit",
    "clinical.sign",
    "schedule.view",
    "schedule.edit",
    "bookings.manage",
    "billing.view",
    "reports.viewOwn",
    "waitlist.manage",
    "recalls.manage",
  ],
  hygienist: [
    "patients.view",
    "patients.edit",
    "clinical.view",
    "clinical.edit",
    "clinical.sign",
    "schedule.view",
    "schedule.edit",
    "bookings.manage",
    "reports.viewOwn",
    "waitlist.manage",
    "recalls.manage",
  ],
  assistant: [
    "patients.view",
    "clinical.view",
    "clinical.edit",
    "schedule.view",
    "schedule.edit",
    "waitlist.manage",
  ],
  front_desk: [
    "patients.view",
    "patients.edit",
    "schedule.view",
    "schedule.edit",
    "bookings.manage",
    "billing.view",
    "waitlist.manage",
    "recalls.manage",
    "inventory.manage",
  ],
  billing_specialist: [
    "patients.view",
    "schedule.view",
    "billing.view",
    "billing.manage",
    "claims.manage",
    "reports.view",
  ],
  read_only_auditor: READ_ONLY,
};

export function can(role: ClinicRole | null | undefined, action: Permission): boolean {
  if (!role) return false;
  return MATRIX[role]?.includes(action) ?? false;
}

export function canAny(role: ClinicRole | null | undefined, actions: Permission[]): boolean {
  return actions.some((a) => can(role, a));
}

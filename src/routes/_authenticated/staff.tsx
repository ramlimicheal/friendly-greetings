import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRequirePermission } from "@/hooks/use-permissions";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserPlus, ShieldCheck, X, Copy, Check, Link2, ScrollText } from "lucide-react";
import { AppShell, Card, Pill, PrimaryButton, GhostButton } from "@/components/app-shell";
import { useClinic } from "@/hooks/use-clinic";
import {
  listStaff,
  listInvitations,
  createInvitation,
  revokeInvitation,
  updateStaffRole,
  setStaffActive,
  listAuditLog,
  type ClinicRole,
  type StaffMember,
  type Invitation,
} from "@/lib/staff.functions";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "Staff — Enamel Clinic" },
      { name: "description", content: "Manage staff accounts, invitations and roles." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StaffPage,
});

const ROLES: { value: ClinicRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "dentist", label: "Dentist" },
  { value: "hygienist", label: "Hygienist" },
  { value: "assistant", label: "Assistant" },
  { value: "front_desk", label: "Front desk" },
  { value: "billing_specialist", label: "Billing" },
  { value: "read_only_auditor", label: "Read-only auditor" },
];

function StaffPage() {
  useRequirePermission("staff.manage");
  const { activeClinicId, activeRole, loading: clinicLoading } = useClinic();

  const qc = useQueryClient();
  const listStaffFn = useServerFn(listStaff);
  const listInvitationsFn = useServerFn(listInvitations);
  const listAuditFn = useServerFn(listAuditLog);

  const canQuery = !!activeClinicId;
  const clinicId = activeClinicId ?? "";

  const staffQ = useQuery({
    queryKey: ["staff", clinicId],
    queryFn: () => listStaffFn({ data: { clinic_id: clinicId } }),
    enabled: canQuery,
  });
  const invQ = useQuery({
    queryKey: ["invitations", clinicId],
    queryFn: () => listInvitationsFn({ data: { clinic_id: clinicId } }),
    enabled: canQuery,
  });
  const auditQ = useQuery({
    queryKey: ["audit_log", clinicId],
    queryFn: () => listAuditFn({ data: { clinic_id: clinicId } }),
    enabled: canQuery,
  });

  const [inviteOpen, setInviteOpen] = useState(false);

  if (clinicLoading) {
    return (
      <AppShell title="Staff">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }
  if (!activeClinicId) {
    return (
      <AppShell title="Staff">
        <p className="text-sm text-muted-foreground">Select a clinic to manage staff.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Staff & access"
      subtitle="Invite team members, manage roles, and review activity."
      actions={
        <PrimaryButton icon={UserPlus} onClick={() => setInviteOpen(true)}>
          Invite staff
        </PrimaryButton>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold">Team members</h3>
              <Pill tone="muted">{staffQ.data?.length ?? 0}</Pill>
            </div>
            <StaffTable
              staff={staffQ.data ?? []}
              clinicId={clinicId}
              callerRole={activeRole}
              onChange={() => qc.invalidateQueries({ queryKey: ["staff", clinicId] })}
            />
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold">Pending invitations</h3>
              <Pill tone="muted">
                {(invQ.data ?? []).filter((i) => !i.used_at && !i.revoked_at).length}
              </Pill>
            </div>
            <InvitationsTable
              invitations={invQ.data ?? []}
              onChange={() => qc.invalidateQueries({ queryKey: ["invitations", clinicId] })}
            />
          </Card>
        </div>

        <Card className="lg:col-span-1">
          <div className="mb-4 flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold">Recent activity</h3>
          </div>
          <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
            {!auditQ.data || auditQ.data.length === 0 ? (
              <p className="text-xs text-muted-foreground">No activity yet.</p>
            ) : (
              auditQ.data.map((e) => (
                <div key={e.id} className="rounded-xl border border-border/70 bg-background/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{e.action}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {e.actor_name ?? e.actor_email ?? "system"}
                    {e.entity_type ? ` · ${e.entity_type}` : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {inviteOpen && (
        <InviteDialog
          clinicId={clinicId}
          callerRole={activeRole}
          onClose={() => setInviteOpen(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["invitations", clinicId] })}
        />
      )}
    </AppShell>
  );
}

function StaffTable({
  staff,
  clinicId,
  callerRole,
  onChange,
}: {
  staff: StaffMember[];
  clinicId: string;
  callerRole: ClinicRole | null;
  onChange: () => void;
}) {
  const updateRoleFn = useServerFn(updateStaffRole);
  const setActiveFn = useServerFn(setStaffActive);
  const updateRoleM = useMutation({
    mutationFn: (v: { user_id: string; role: ClinicRole }) =>
      updateRoleFn({ data: { clinic_id: clinicId, ...v } }),
    onSuccess: onChange,
  });
  const activeM = useMutation({
    mutationFn: (v: { user_id: string; is_active: boolean }) =>
      setActiveFn({ data: { clinic_id: clinicId, ...v } }),
    onSuccess: onChange,
  });

  if (staff.length === 0) {
    return <p className="text-xs text-muted-foreground">No staff yet.</p>;
  }

  const canEditRow = (row: StaffMember) => {
    if (callerRole === "owner") return true;
    if (callerRole === "admin") return row.role !== "owner";
    return false;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="pb-2 pr-3">Name</th>
            <th className="pb-2 pr-3">Email</th>
            <th className="pb-2 pr-3">Role</th>
            <th className="pb-2 pr-3">Status</th>
            <th className="pb-2 pr-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => {
            const editable = canEditRow(s);
            const roleOptions = callerRole === "owner" ? ROLES : ROLES.filter((r) => r.value !== "owner");
            return (
              <tr key={s.user_id} className="border-t border-border/60">
                <td className="py-2 pr-3 font-medium">{s.full_name ?? "—"}</td>
                <td className="py-2 pr-3 text-muted-foreground">{s.email ?? "—"}</td>
                <td className="py-2 pr-3">
                  <select
                    value={s.role}
                    disabled={!editable}
                    onChange={(e) =>
                      updateRoleM.mutate({ user_id: s.user_id, role: e.target.value as ClinicRole })
                    }
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs disabled:opacity-60"
                  >
                    {roleOptions.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-3">
                  {s.is_active ? (
                    <Pill tone="success">Active</Pill>
                  ) : (
                    <Pill tone="danger">Disabled</Pill>
                  )}
                </td>
                <td className="py-2 pr-3 text-right">
                  <button
                    disabled={!editable}
                    onClick={() =>
                      activeM.mutate({ user_id: s.user_id, is_active: !s.is_active })
                    }
                    className="text-xs font-medium text-foreground underline-offset-2 hover:underline disabled:opacity-40 disabled:no-underline"
                  >
                    {s.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function InvitationsTable({
  invitations,
  onChange,
}: {
  invitations: Invitation[];
  onChange: () => void;
}) {
  const revokeFn = useServerFn(revokeInvitation);
  const revokeM = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { id } }),
    onSuccess: onChange,
  });

  if (invitations.length === 0) {
    return <p className="text-xs text-muted-foreground">No invitations yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="pb-2 pr-3">Email</th>
            <th className="pb-2 pr-3">Role</th>
            <th className="pb-2 pr-3">Status</th>
            <th className="pb-2 pr-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((inv) => {
            const expired = new Date(inv.expires_at).getTime() < Date.now();
            const active = !inv.used_at && !inv.revoked_at && !expired;
            return (
              <tr key={inv.id} className="border-t border-border/60">
                <td className="py-2 pr-3 font-medium">{inv.email}</td>
                <td className="py-2 pr-3 text-muted-foreground">
                  {ROLES.find((r) => r.value === inv.clinic_role)?.label ?? inv.clinic_role}
                </td>
                <td className="py-2 pr-3">
                  {inv.used_at ? (
                    <Pill tone="muted">Used</Pill>
                  ) : inv.revoked_at ? (
                    <Pill tone="muted">Revoked</Pill>
                  ) : expired ? (
                    <Pill tone="danger">Expired</Pill>
                  ) : (
                    <Pill tone="info">Pending</Pill>
                  )}
                </td>
                <td className="py-2 pr-3 text-right">
                  {active && (
                    <button
                      onClick={() => revokeM.mutate(inv.id)}
                      className="text-xs font-medium text-destructive underline-offset-2 hover:underline"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function InviteDialog({
  clinicId,
  callerRole,
  onClose,
  onCreated,
}: {
  clinicId: string;
  callerRole: ClinicRole | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ClinicRole>("front_desk");
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const createFn = useServerFn(createInvitation);
  const createM = useMutation({
    mutationFn: () => createFn({ data: { clinic_id: clinicId, email, role } }),
    onSuccess: (row) => {
      const url = `${window.location.origin}/auth?invite=${row.raw_token}`;
      setLink(url);
      onCreated();
    },
    onError: (e: Error) => setError(e.message),
  });

  const availableRoles = callerRole === "owner" ? ROLES : ROLES.filter((r) => r.value !== "owner");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 ring-1 ring-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Invite staff member</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        {!link ? (
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              createM.mutate();
            }}
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as ClinicRole)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              >
                {availableRoles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <GhostButton onClick={onClose}>Cancel</GhostButton>
              <PrimaryButton type="submit" disabled={createM.isPending}>
                {createM.isPending ? "Creating…" : "Create invitation"}
              </PrimaryButton>
            </div>
          </form>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              This link is shown only once. Copy it now and share with {email}. It won't be
              displayed again.
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs font-mono break-all">
              {link}
            </div>
            <div className="flex justify-end gap-2">
              <GhostButton
                onClick={async () => {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                icon={copied ? Check : Copy}
              >
                {copied ? "Copied" : "Copy link"}
              </GhostButton>
              <PrimaryButton onClick={onClose}>Done</PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

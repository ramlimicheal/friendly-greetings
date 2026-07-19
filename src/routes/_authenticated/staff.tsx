import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRequirePermission } from "@/hooks/use-permissions";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { UserPlus, ShieldCheck, X, Copy, Check, Link2, ScrollText } from "lucide-react";
import { AppShell, Card, Pill, PrimaryButton, GhostButton } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import {
  listStaff,
  listInvitations,
  createInvitation,
  revokeInvitation,
  updateStaffRole,
  setStaffActive,
  listAuditLog,
  type AppRole,
  type StaffMember,
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

const ROLES: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "dentist", label: "Dentist" },
  { value: "hygienist", label: "Hygienist" },
  { value: "front_desk", label: "Front desk" },
];

function StaffPage() {
  useRequirePermission("staff.manage");
  const { roles, loading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = roles.includes("admin");

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/" });
  }, [loading, isAdmin, navigate]);

  const qc = useQueryClient();
  const listStaffFn = useServerFn(listStaff);
  const listInvitationsFn = useServerFn(listInvitations);
  const listAuditFn = useServerFn(listAuditLog);

  const staffQ = useQuery({
    queryKey: ["staff"],
    queryFn: () => listStaffFn(),
    enabled: isAdmin,
  });
  const invQ = useQuery({
    queryKey: ["invitations"],
    queryFn: () => listInvitationsFn(),
    enabled: isAdmin,
  });
  const auditQ = useQuery({
    queryKey: ["audit_log"],
    queryFn: () => listAuditFn(),
    enabled: isAdmin,
  });

  const [inviteOpen, setInviteOpen] = useState(false);

  if (loading) {
    return (
      <AppShell title="Staff">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }
  if (!isAdmin) {
    return (
      <AppShell title="Staff">
        <p className="text-sm text-muted-foreground">Admins only.</p>
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
            <StaffTable staff={staffQ.data ?? []} onChange={() => qc.invalidateQueries({ queryKey: ["staff"] })} />
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold">Pending invitations</h3>
              <Pill tone="muted">{(invQ.data ?? []).filter((i) => !i.used_at).length}</Pill>
            </div>
            <InvitationsTable
              invitations={invQ.data ?? []}
              onChange={() => qc.invalidateQueries({ queryKey: ["invitations"] })}
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
          onClose={() => setInviteOpen(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["invitations"] })}
        />
      )}
    </AppShell>
  );
}

function StaffTable({ staff, onChange }: { staff: StaffMember[]; onChange: () => void }) {
  const updateRoleFn = useServerFn(updateStaffRole);
  const setActiveFn = useServerFn(setStaffActive);
  const updateRoleM = useMutation({
    mutationFn: (v: { user_id: string; role: AppRole }) => updateRoleFn({ data: v }),
    onSuccess: onChange,
  });
  const activeM = useMutation({
    mutationFn: (v: { user_id: string; is_active: boolean }) => setActiveFn({ data: v }),
    onSuccess: onChange,
  });

  if (staff.length === 0) {
    return <p className="text-xs text-muted-foreground">No staff yet.</p>;
  }

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
          {staff.map((s) => (
            <tr key={s.id} className="border-t border-border/60">
              <td className="py-2 pr-3 font-medium">{s.full_name ?? "—"}</td>
              <td className="py-2 pr-3 text-muted-foreground">{s.email ?? "—"}</td>
              <td className="py-2 pr-3">
                <select
                  value={s.roles[0] ?? ""}
                  onChange={(e) => updateRoleM.mutate({ user_id: s.id, role: e.target.value as AppRole })}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                >
                  <option value="" disabled>
                    No role
                  </option>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-2 pr-3">
                {s.is_active ? <Pill tone="success">Active</Pill> : <Pill tone="danger">Disabled</Pill>}
              </td>
              <td className="py-2 pr-3 text-right">
                <button
                  onClick={() => activeM.mutate({ user_id: s.id, is_active: !s.is_active })}
                  className="text-xs font-medium text-foreground underline-offset-2 hover:underline"
                >
                  {s.is_active ? "Deactivate" : "Reactivate"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InvitationsTable({
  invitations,
  onChange,
}: {
  invitations: Array<{
    id: string;
    email: string;
    role: AppRole;
    token: string;
    expires_at: string;
    used_at: string | null;
  }>;
  onChange: () => void;
}) {
  const revokeFn = useServerFn(revokeInvitation);
  const revokeM = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { id } }),
    onSuccess: onChange,
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyLink = async (token: string, id: string) => {
    const url = `${window.location.origin}/auth?invite=${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

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
            return (
              <tr key={inv.id} className="border-t border-border/60">
                <td className="py-2 pr-3 font-medium">{inv.email}</td>
                <td className="py-2 pr-3 text-muted-foreground">
                  {ROLES.find((r) => r.value === inv.role)?.label ?? inv.role}
                </td>
                <td className="py-2 pr-3">
                  {inv.used_at ? (
                    <Pill tone="muted">Used</Pill>
                  ) : expired ? (
                    <Pill tone="danger">Expired</Pill>
                  ) : (
                    <Pill tone="info">Pending</Pill>
                  )}
                </td>
                <td className="py-2 pr-3 text-right">
                  <div className="inline-flex items-center gap-3">
                    {!inv.used_at && !expired && (
                      <button
                        onClick={() => copyLink(inv.token, inv.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        {copiedId === inv.id ? (
                          <>
                            <Check className="h-3 w-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy link
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => revokeM.mutate(inv.id)}
                      className="text-xs font-medium text-destructive underline-offset-2 hover:underline"
                    >
                      Revoke
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function InviteDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("front_desk");
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const createFn = useServerFn(createInvitation);
  const createM = useMutation({
    mutationFn: () => createFn({ data: { email, role } }),
    onSuccess: (row) => {
      const url = `${window.location.origin}/auth?invite=${row.token}`;
      setLink(url);
      onCreated();
    },
    onError: (e: Error) => setError(e.message),
  });

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
                onChange={(e) => setRole(e.target.value as AppRole)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              >
                {ROLES.map((r) => (
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
            <p className="text-sm text-muted-foreground">
              Invitation created. Share this link with {email}:
            </p>
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs font-mono break-all">
              {link}
            </div>
            <div className="flex justify-end gap-2">
              <GhostButton
                onClick={async () => {
                  await navigator.clipboard.writeText(link);
                }}
                icon={Copy}
              >
                Copy link
              </GhostButton>
              <PrimaryButton onClick={onClose}>Done</PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

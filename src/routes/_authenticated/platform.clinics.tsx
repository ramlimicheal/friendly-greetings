import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Building2, Plus, Power, LogIn, X } from "lucide-react";
import { AppShell, Card, Pill, PrimaryButton, GhostButton } from "@/components/app-shell";
import { useClinic } from "@/hooks/use-clinic";
import {
  listPlatformClinics,
  listPlatformOrganizations,
  setClinicActive,
  createPlatformClinic,
  impersonateClinic,
  type PlatformClinic,
  type PlatformOrganization,
} from "@/lib/platform.functions";

export const Route = createFileRoute("/_authenticated/platform/clinics")({
  head: () => ({
    meta: [
      { title: "Platform · Clinics — Enamel" },
      { name: "description", content: "Super-admin console for managing clinics and organizations." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlatformClinicsPage,
});

function PlatformClinicsPage() {
  const { platformRole, loading, reload } = useClinic();
  const navigate = useNavigate();
  const isSuper = platformRole === "super_admin";

  useEffect(() => {
    if (!loading && !isSuper) navigate({ to: "/" });
  }, [loading, isSuper, navigate]);

  const qc = useQueryClient();
  const listClinicsFn = useServerFn(listPlatformClinics);
  const listOrgsFn = useServerFn(listPlatformOrganizations);
  const setActiveFn = useServerFn(setClinicActive);
  const impersonateFn = useServerFn(impersonateClinic);

  const clinicsQ = useQuery({
    queryKey: ["platform", "clinics"],
    queryFn: () => listClinicsFn(),
    enabled: isSuper,
  });
  const orgsQ = useQuery({
    queryKey: ["platform", "organizations"],
    queryFn: () => listOrgsFn(),
    enabled: isSuper,
  });

  const toggleActive = useMutation({
    mutationFn: (v: { clinic_id: string; is_active: boolean }) =>
      setActiveFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform", "clinics"] }),
  });

  const impersonate = useMutation({
    mutationFn: (clinic_id: string) => impersonateFn({ data: { clinic_id } }),
    onSuccess: async () => {
      await reload();
      navigate({ to: "/" });
    },
  });

  const [createOpen, setCreateOpen] = useState(false);

  if (loading) {
    return (
      <AppShell title="Platform · Clinics">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }
  if (!isSuper) {
    return (
      <AppShell title="Platform · Clinics">
        <p className="text-sm text-muted-foreground">Super admins only.</p>
      </AppShell>
    );
  }

  const clinics = clinicsQ.data ?? [];
  const orgs = orgsQ.data ?? [];
  const activeCount = clinics.filter((c) => c.is_active).length;
  const totalPatients = clinics.reduce((s, c) => s + c.patient_count, 0);
  const totalAppts = clinics.reduce((s, c) => s + c.appointment_count, 0);

  return (
    <AppShell
      title="Platform · Clinics"
      subtitle="Manage every Enamel workspace on this instance."
      actions={
        <PrimaryButton onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New clinic
        </PrimaryButton>
      }
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Organizations" value={orgs.length} />
        <StatCard label="Clinics" value={clinics.length} />
        <StatCard label="Active" value={activeCount} />
        <StatCard label="Patients · Appointments" value={`${totalPatients} · ${totalAppts}`} />
      </div>

      <Card className="mt-6 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Clinic</th>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Chairs</th>
                <th className="px-4 py-3">Members</th>
                <th className="px-4 py-3">Patients</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clinics.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.slug ?? "—"} · {c.timezone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.organization_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {[c.city, c.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">{c.chair_count}</td>
                  <td className="px-4 py-3">{c.member_count}</td>
                  <td className="px-4 py-3">{c.patient_count}</td>
                  <td className="px-4 py-3">
                    <Pill tone={c.is_active ? "green" : "amber"}>
                      {c.is_active ? "Active" : "Suspended"}
                    </Pill>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <GhostButton
                        onClick={() => impersonate.mutate(c.id)}
                        disabled={impersonate.isPending}
                        title="Switch into this clinic"
                      >
                        <LogIn className="mr-1 h-3.5 w-3.5" />
                        Enter
                      </GhostButton>
                      <GhostButton
                        onClick={() =>
                          toggleActive.mutate({ clinic_id: c.id, is_active: !c.is_active })
                        }
                        disabled={toggleActive.isPending}
                      >
                        <Power className="mr-1 h-3.5 w-3.5" />
                        {c.is_active ? "Suspend" : "Resume"}
                      </GhostButton>
                    </div>
                  </td>
                </tr>
              ))}
              {clinics.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-muted-foreground" colSpan={8}>
                    No clinics yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {createOpen && (
        <CreateClinicDialog
          orgs={orgs}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            qc.invalidateQueries({ queryKey: ["platform"] });
          }}
        />
      )}
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </Card>
  );
}

function CreateClinicDialog({
  orgs,
  onClose,
  onCreated,
}: {
  orgs: PlatformOrganization[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const createFn = useServerFn(createPlatformClinic);
  const [mode, setMode] = useState<"existing" | "new">(orgs.length ? "existing" : "new");
  const [orgId, setOrgId] = useState(orgs[0]?.id ?? "");
  const [newOrg, setNewOrg] = useState("");
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [chairs, setChairs] = useState(4);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          organization_id: mode === "existing" ? orgId : undefined,
          new_organization_name: mode === "new" ? newOrg : undefined,
          name,
          timezone,
          chair_count: chairs,
          city: city || undefined,
          country: country || undefined,
        },
      }),
    onSuccess: () => onCreated(),
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">New clinic</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("existing")}
              disabled={!orgs.length}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                mode === "existing" ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              Existing organization
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                mode === "new" ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              New organization
            </button>
          </div>

          {mode === "existing" ? (
            <Field label="Organization">
              <select
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="New organization name">
              <input
                value={newOrg}
                onChange={(e) => setNewOrg(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="Bright Smile Group"
              />
            </Field>
          )}

          <Field label="Clinic name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Downtown Location"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Timezone">
              <input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Chairs">
              <input
                type="number"
                min={1}
                max={50}
                value={chairs}
                onChange={(e) => setChairs(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="City">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Country">
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <GhostButton onClick={onClose}>Cancel</GhostButton>
            <PrimaryButton
              onClick={() => create.mutate()}
              disabled={create.isPending || !name || (mode === "existing" ? !orgId : !newOrg)}
            >
              {create.isPending ? "Creating…" : "Create clinic"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}

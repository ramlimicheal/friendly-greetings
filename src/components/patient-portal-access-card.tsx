import { useEffect, useState } from "react";
import { ShieldCheck, Copy, Loader2, X } from "lucide-react";
import {
  listPatientPortalInvitations,
  createPortalInvitation,
  revokePortalInvitation,
  revokePortalAccess,
  type StaffPortalInvitation,
} from "@/lib/portal-api";

export function PatientPortalAccessCard({
  patientId,
  patientEmail,
}: {
  patientId: string;
  patientEmail: string | null;
}) {
  const [invites, setInvites] = useState<StaffPortalInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState(patientEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [issuedLink, setIssuedLink] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setInvites(await listPatientPortalInvitations(patientId));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load invitations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const invite = async () => {
    setBusy(true);
    setErr(null);
    setIssuedLink(null);
    try {
      const r = await createPortalInvitation(patientId, email.trim());
      const url = `${window.location.origin}/portal?invite=${encodeURIComponent(r.raw_token)}`;
      setIssuedLink(url);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create invitation");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    await revokePortalInvitation(id);
    await load();
  };

  const revokeAccess = async () => {
    if (!confirm("Revoke this patient's portal access?")) return;
    await revokePortalAccess(patientId);
    await load();
  };

  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold">Patient portal access</div>
        </div>
        <button
          type="button"
          onClick={revokeAccess}
          className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
        >
          Revoke current access
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Send a secure invitation link so this patient can sign in and see their appointments, shared
        treatment plans, and issued invoices.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="patient@example.com"
          className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        />
        <button
          onClick={invite}
          disabled={busy || !email.trim()}
          className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Creating…" : "Send invitation"}
        </button>
      </div>

      {err && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {err}
        </div>
      )}

      {issuedLink && (
        <div className="mt-3 rounded-lg border border-border bg-muted/50 p-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            One-time invitation link
          </div>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-background px-2 py-1 text-[11px]">{issuedLink}</code>
            <button
              onClick={() => navigator.clipboard.writeText(issuedLink)}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] hover:bg-background"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Share this link with the patient. It won't be shown again after you close this dialog.
          </div>
        </div>
      )}

      <div className="mt-5">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Recent invitations
        </div>
        {loading ? (
          <div className="flex justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : invites.length === 0 ? (
          <p className="text-xs text-muted-foreground">No invitations sent yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {invites.map((i) => {
              const status = i.used_at
                ? "used"
                : i.revoked_at
                  ? "revoked"
                  : new Date(i.expires_at) <= new Date()
                    ? "expired"
                    : "active";
              return (
                <li key={i.id} className="flex items-center justify-between px-3 py-2 text-xs">
                  <div>
                    <div className="font-medium">{i.email_masked}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Sent {new Date(i.created_at).toLocaleDateString()} · Expires{" "}
                      {new Date(i.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize">
                      {status}
                    </span>
                    {status === "active" && (
                      <button
                        onClick={() => revoke(i.id)}
                        title="Revoke"
                        className="rounded-full border border-border p-1 hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

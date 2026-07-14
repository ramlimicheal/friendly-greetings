import { useEffect, useState } from "react";
import { Plus, Trash2, Lock, Unlock } from "lucide-react";
import {
  createNote, deleteNote, listNotes, signNote, updateNote,
  type ClinicalNoteRow,
} from "@/lib/clinical-notes-api";

export function ClinicalNotesPanel({ patientId }: { patientId: string }) {
  const [notes, setNotes] = useState<ClinicalNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setNotes(await listNotes(patientId)); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [patientId]);

  const addNew = async () => {
    try {
      const row = await createNote({
        patient_id: patientId,
        visit_date: new Date().toISOString().slice(0, 10),
        subjective: "", objective: "", assessment: "", plan: "",
      });
      setNotes((xs) => [row, ...xs]);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Clinical notes (SOAP)</div>
          <div className="text-xs text-muted-foreground">Subjective · Objective · Assessment · Plan. Sign to lock.</div>
        </div>
        <button onClick={addNew} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
          <Plus className="h-3.5 w-3.5" /> New note
        </button>
      </div>

      {err && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-100">{err}</div>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : notes.length === 0 ? (
        <div className="rounded-2xl bg-muted/40 p-8 text-center">
          <div className="text-sm font-medium">No clinical notes yet</div>
          <p className="mt-1 text-xs text-muted-foreground">Click "New note" to document a visit.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <NoteCard key={n.id} note={n}
              onChange={(patch) => updateNote(n.id, patch as any).then((u) => setNotes((xs) => xs.map((x) => x.id === n.id ? u : x)))}
              onSign={() => signNote(n.id).then((u) => setNotes((xs) => xs.map((x) => x.id === n.id ? u : x)))}
              onDelete={() => deleteNote(n.id).then(() => setNotes((xs) => xs.filter((x) => x.id !== n.id)))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function NoteCard({ note, onChange, onSign, onDelete }: {
  note: ClinicalNoteRow;
  onChange: (patch: Partial<ClinicalNoteRow>) => Promise<any>;
  onSign: () => Promise<any>;
  onDelete: () => Promise<void>;
}) {
  const signed = !!note.signed_at;
  const [local, setLocal] = useState(note);
  useEffect(() => setLocal(note), [note.id, note.updated_at]);

  const commit = (field: keyof ClinicalNoteRow) => {
    if ((local as any)[field] !== (note as any)[field]) onChange({ [field]: (local as any)[field] } as any);
  };

  return (
    <li className={"rounded-2xl border p-4 " + (signed ? "border-emerald-200 bg-emerald-50/30" : "border-border bg-card")}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <input type="date" disabled={signed} value={local.visit_date}
            onChange={(e) => setLocal({ ...local, visit_date: e.target.value })}
            onBlur={() => commit("visit_date")}
            className="rounded-md border border-border bg-background px-2 py-1" />
          <input disabled={signed} placeholder="Provider" value={local.provider ?? ""}
            onChange={(e) => setLocal({ ...local, provider: e.target.value })}
            onBlur={() => commit("provider")}
            className="rounded-md border border-border bg-background px-2 py-1" />
          {signed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
              <Lock className="h-3 w-3" /> Signed {new Date(note.signed_at!).toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!signed && (
            <button onClick={onSign} className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:opacity-90">
              <Unlock className="h-3 w-3" /> Sign
            </button>
          )}
          <button onClick={onDelete} className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {(["subjective","objective","assessment","plan"] as const).map((k) => (
          <div key={k}>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{k}</label>
            <textarea disabled={signed} value={(local as any)[k] ?? ""} rows={3}
              onChange={(e) => setLocal({ ...local, [k]: e.target.value } as any)}
              onBlur={() => commit(k)}
              placeholder={placeholderFor(k)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-70" />
          </div>
        ))}
      </div>
    </li>
  );
}

function placeholderFor(k: "subjective" | "objective" | "assessment" | "plan"): string {
  switch (k) {
    case "subjective": return "Chief complaint, history, patient-reported symptoms…";
    case "objective":  return "Exam findings, radiographs, measurements…";
    case "assessment": return "Diagnosis, differential…";
    case "plan":       return "Treatment plan, next steps, prescriptions…";
  }
}

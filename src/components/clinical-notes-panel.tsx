import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Lock, Unlock, Mic, Sparkles, X, StopCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  createNote, deleteNote, listNotes, signNote, updateNote,
  type ClinicalNoteRow,
} from "@/lib/clinical-notes-api";
import { draftSoapNote } from "@/lib/ai.functions";

export function ClinicalNotesPanel({ patientId }: { patientId: string }) {
  const [notes, setNotes] = useState<ClinicalNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

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

  const addFromDraft = async (draft: { subjective: string; objective: string; assessment: string; plan: string }) => {
    try {
      const row = await createNote({
        patient_id: patientId,
        visit_date: new Date().toISOString().slice(0, 10),
        ...draft,
      });
      setNotes((xs) => [row, ...xs]);
      setAiOpen(false);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Clinical notes (SOAP)</div>
          <div className="text-xs text-muted-foreground">Subjective · Objective · Assessment · Plan. Sign to lock.</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAiOpen(true)} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
            <Sparkles className="h-3.5 w-3.5" /> AI dictation
          </button>
          <button onClick={addNew} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> New note
          </button>
        </div>
      </div>

      {err && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-100">{err}</div>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : notes.length === 0 ? (
        <div className="rounded-2xl bg-muted/40 p-8 text-center">
          <div className="text-sm font-medium">No clinical notes yet</div>
          <p className="mt-1 text-xs text-muted-foreground">Click "New note" or use AI dictation to document a visit.</p>
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

      {aiOpen && <DictationDialog onClose={() => setAiOpen(false)} onAccept={addFromDraft} />}
    </div>
  );
}

function DictationDialog({ onClose, onAccept }: { onClose: () => void; onAccept: (d: { subjective: string; objective: string; assessment: string; plan: string }) => Promise<void> }) {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ subjective: string; objective: string; assessment: string; plan: string } | null>(null);
  const recRef = useRef<any>(null);
  const draftFn = useServerFn(draftSoapNote);

  const startMic = () => {
    setErr(null);
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setErr("Speech recognition not supported in this browser. Type or paste your notes instead."); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    let final = transcript;
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + " ";
        else interim += t;
      }
      setTranscript((final + interim).trim());
    };
    rec.onerror = (e: any) => { setErr(e.error === "not-allowed" ? "Microphone access denied" : `Mic error: ${e.error}`); setListening(false); };
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };
  const stopMic = () => { recRef.current?.stop(); setListening(false); };

  const generate = async () => {
    setBusy(true); setErr(null);
    try {
      const d = await draftFn({ data: { transcript } });
      setDraft(d);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to draft note"); }
    finally { setBusy(false); }
  };

  const accept = async () => {
    if (!draft) return;
    setBusy(true);
    try { await onAccept(draft); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed"); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-card p-6 ring-1 ring-border">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white"><Sparkles className="h-4 w-4" /></span>
            <div>
              <h3 className="text-base font-semibold">AI clinical note dictation</h3>
              <p className="text-xs text-muted-foreground">Dictate or paste raw notes — AI drafts a structured SOAP entry.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {!draft && (
          <>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Transcript</label>
              {!listening ? (
                <button onClick={startMic} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium hover:bg-muted">
                  <Mic className="h-3.5 w-3.5" /> Start mic
                </button>
              ) : (
                <button onClick={stopMic} className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:opacity-90">
                  <StopCircle className="h-3.5 w-3.5 animate-pulse" /> Stop
                </button>
              )}
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="e.g. Patient presents with sensitivity on 14, cold test positive, no lingering pain. Exam shows MOD amalgam with recurrent decay. Plan to replace with composite next visit."
              rows={8}
              className="w-full rounded-2xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            {err && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-100">{err}</div>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={generate} disabled={busy || transcript.trim().length < 5}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                <Sparkles className="h-3.5 w-3.5" /> {busy ? "Drafting…" : "Draft SOAP note"}
              </button>
            </div>
          </>
        )}

        {draft && (
          <>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {(["subjective","objective","assessment","plan"] as const).map((k) => (
                <div key={k}>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{k}</label>
                  <textarea value={draft[k]} rows={4}
                    onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              ))}
            </div>
            {err && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-100">{err}</div>}
            <div className="mt-4 flex justify-between">
              <button onClick={() => setDraft(null)} className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted">← Edit transcript</button>
              <div className="flex gap-2">
                <button onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={accept} disabled={busy} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {busy ? "Saving…" : "Save as new note"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
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

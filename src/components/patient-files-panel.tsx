import { useEffect, useRef, useState } from "react";
import { Upload, FileText, Image as ImageIcon, Trash2, Download, Loader2, Paperclip } from "lucide-react";
import { Card, GhostButton, SectionHeader } from "@/components/app-shell";
import { useClinic } from "@/hooks/use-clinic";
import { usePermissions, Can } from "@/hooks/use-permissions";
import {
  deletePatientFile,
  getSignedFileUrl,
  humanSize,
  listPatientFiles,
  uploadPatientFile,
  type FileCategory,
  type PatientFileRow,
} from "@/lib/patient-files-api";

const CATEGORIES: { value: FileCategory; label: string }[] = [
  { value: "xray", label: "X-ray" },
  { value: "photo", label: "Photo" },
  { value: "consent", label: "Consent" },
  { value: "insurance", label: "Insurance card" },
  { value: "document", label: "Document" },
];

export function PatientFilesPanel({ patientId }: { patientId: string }) {
  const { activeClinicId } = useClinic();
  const { can } = usePermissions();
  const [files, setFiles] = useState<PatientFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<FileCategory>("xray");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      setFiles(await listPatientFiles(patientId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const onPick = () => inputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!activeClinicId) { setError("No active clinic"); return; }
    if (file.size > 25 * 1024 * 1024) { setError("Max file size is 25 MB"); return; }
    setUploading(true);
    setError(null);
    try {
      await uploadPatientFile({ clinicId: activeClinicId, patientId, file, category });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onDownload = async (row: PatientFileRow) => {
    try {
      const url = await getSignedFileUrl(row.storage_path, 300);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open file");
    }
  };

  const onDelete = async (row: PatientFileRow) => {
    if (!confirm(`Delete "${row.file_name}"?`)) return;
    try {
      await deletePatientFile(row);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const canUpload = can("clinical.edit") || can("billing.edit") || can("staff.manage");

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionHeader title="Files & Images" icon={Paperclip} />
        {canUpload && (
          <div className="flex items-center gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FileCategory)}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <GhostButton icon={uploading ? Loader2 : Upload} onClick={onPick} disabled={uploading}>
              {uploading ? "Uploading…" : "Upload"}
            </GhostButton>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={onFileChange}
              accept="image/*,application/pdf,.doc,.docx"
            />
          </div>
        )}
      </div>

      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : files.length === 0 ? (
        <div className="rounded-2xl bg-muted/40 p-8 text-center">
          <p className="text-sm font-medium">No files uploaded yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload X-rays, intraoral photos, consent forms, and insurance cards.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {files.map((f) => {
            const isImage = (f.mime_type ?? "").startsWith("image/");
            return (
              <li key={f.id} className="flex items-center gap-3 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted">
                  {isImage ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{f.file_name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {CATEGORIES.find((c) => c.value === f.category)?.label ?? f.category} · {humanSize(f.size_bytes)} · {new Date(f.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => onDownload(f)}
                  className="rounded-full border border-border p-2 hover:bg-muted"
                  title="Open / download"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <Can perm="clinical.edit">
                  <button
                    onClick={() => onDelete(f)}
                    className="rounded-full border border-border p-2 text-destructive hover:bg-destructive/10"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </Can>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

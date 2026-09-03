"use client";

import { useRef, useState, useTransition } from "react";
import { EVIDENCE_CATEGORIES, type EvidenceFile } from "@/types/database";
import Button from "@/components/ui/button";
import {
  deleteEvidenceFile,
  getEvidenceFileUrl,
  uploadEvidenceFile,
} from "@/lib/actions/evidence";

export default function EvidenceLibraryTab({
  participantId,
  files,
}: {
  participantId: string;
  files: EvidenceFile[];
}) {
  const [pending, startTransition] = useTransition();
  const [deletingId, startDeleteTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleView(filePath: string) {
    const url = await getEvidenceFileUrl(filePath);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  const folders = EVIDENCE_CATEGORIES.map((category) => ({
    category,
    files: files.filter((f) => f.category === category),
  })).filter((folder) => folder.files.length > 0);

  return (
    <div className="max-w-2xl space-y-6">
      <form
        ref={formRef}
        className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const formData = new FormData(e.currentTarget);
          startTransition(async () => {
            try {
              await uploadEvidenceFile(participantId, formData);
              formRef.current?.reset();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Upload failed.");
            }
          });
        }}
      >
        <input
          type="file"
          name="file"
          required
          className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />
        <select
          name="category"
          defaultValue="Other"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          {EVIDENCE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading..." : "Upload evidence"}
        </Button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </form>

      {folders.length === 0 ? (
        <p className="text-sm text-slate-500">No evidence uploaded yet.</p>
      ) : (
        <div className="space-y-5">
          {folders.map((folder) => (
            <div key={folder.category}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                📁 {folder.category}
              </h3>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {folder.files.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {file.file_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Uploaded {new Date(file.uploaded_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleView(file.file_path)}
                        className="text-sm font-medium text-indigo-600 hover:underline"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        disabled={deletingId}
                        onClick={() =>
                          startDeleteTransition(() =>
                            deleteEvidenceFile(participantId, file.id, file.file_path),
                          )
                        }
                        className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

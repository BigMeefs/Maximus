"use client";

import { useRef, useState, useTransition } from "react";
import type { EvidenceFile } from "@/types/database";
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
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {pending ? "Uploading..." : "Upload evidence"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </form>

      {files.length === 0 ? (
        <p className="text-sm text-slate-500">No evidence uploaded yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {files.map((file) => (
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
      )}
    </div>
  );
}

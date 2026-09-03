"use client";

import { useRef, useState, useTransition } from "react";
import {
  deleteBusinessPlanFile,
  getBusinessPlanFileUrl,
  uploadBusinessPlanFile,
} from "@/lib/actions/business-plan";
import Button from "@/components/ui/button";

export default function BusinessPlanFile({
  participantId,
  filePath,
  fileName,
}: {
  participantId: string;
  filePath: string | null;
  fileName: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleView() {
    if (!filePath) return;
    const url = await getBusinessPlanFileUrl(filePath);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  if (filePath && fileName) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-700">{fileName}</span>
        <button
          type="button"
          onClick={handleView}
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          View
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await deleteBusinessPlanFile(participantId, filePath);
            })
          }
          className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
        >
          {pending ? "Removing..." : "Remove"}
        </button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      className="flex items-center gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await uploadBusinessPlanFile(participantId, formData);
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
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Uploading..." : "Upload"}
      </Button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </form>
  );
}

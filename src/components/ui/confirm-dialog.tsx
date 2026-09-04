"use client";

import { useEffect, useId, useRef } from "react";
import Button from "@/components/ui/button";

// Shared confirmation-dialog primitive — Phase 4. Replaces window.confirm()
// at destructive-action sites with the same yes/no decision, styled to
// match the rest of the app, without touching the action itself: callers
// still own the underlying mutation and call it from onConfirm exactly as
// they did inside the old `if (confirm(...))` block.
//
// Built on the native <dialog> element rather than a hand-rolled modal
// framework, specifically because showModal() gives Escape-to-cancel and
// focus trapping for free, correctly, in every evergreen browser — a
// hand-rolled focus trap is exactly the kind of "large modal framework"
// this phase says not to build. Focus return to the element that opened
// the dialog is handled explicitly (browsers don't all do this on their
// own), and the Cancel button receives initial focus so a stray Enter
// keypress right after opening can never trigger the destructive action.
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(e) => {
        // Fired by the Escape key. preventDefault so React state (the
        // `open` prop) drives the actual close via the effect above,
        // keeping the parent in sync with what's on screen.
        e.preventDefault();
        onCancel();
      }}
      onClose={() => {
        restoreFocusRef.current?.focus();
      }}
      className="w-[calc(100%-2rem)] max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-lg backdrop:bg-slate-900/40"
    >
      <h2 id={titleId} className="text-base font-semibold text-slate-900">
        {title}
      </h2>
      <p id={descriptionId} className="mt-2 text-sm text-slate-600">
        {description}
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="secondary" size="compact" autoFocus onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={destructive ? "danger" : "primary"}
          size="compact"
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? "Working..." : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}

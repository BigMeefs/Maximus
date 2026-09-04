"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/confirm-dialog";

export default function DeleteParticipantButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="danger" size="compact" disabled={pending} onClick={() => setConfirmOpen(true)}>
        {pending ? "Deleting..." : "Delete"}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete this participant?"
        description="This removes the participant and all associated records. This cannot be undone."
        confirmLabel="Delete"
        destructive
        pending={pending}
        onConfirm={() => {
          setConfirmOpen(false);
          startTransition(() => {
            action();
          });
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

"use client";

import { useTransition } from "react";
import Button from "@/components/ui/button";

export default function DeleteParticipantButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="danger"
      size="compact"
      disabled={pending}
      onClick={() => {
        if (
          confirm(
            "Delete this participant and all associated records? This cannot be undone.",
          )
        ) {
          startTransition(() => {
            action();
          });
        }
      }}
    >
      {pending ? "Deleting..." : "Delete"}
    </Button>
  );
}

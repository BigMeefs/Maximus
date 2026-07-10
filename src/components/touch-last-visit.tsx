"use client";

import { useEffect } from "react";
import { touchLastVisit } from "@/lib/actions/last-visit";

// Renders nothing — just records "you were here" after the page has
// already read the previous value to compute "what's new since then".
export default function TouchLastVisit({ advisorId }: { advisorId: string }) {
  useEffect(() => {
    touchLastVisit(advisorId);
  }, [advisorId]);

  return null;
}

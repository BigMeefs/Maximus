"use client";

import { useActionState } from "react";
import Badge from "@/components/badge";
import { setAdvisorPin, unlockAdvisorPin, type AdvisorPinManageState } from "@/lib/actions/advisor-pin";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";

const initialState: AdvisorPinManageState = {};

export default function AdvisorPinManager({
  advisorId,
  hasPin,
  isLocked,
  lockedUntil,
}: {
  advisorId: string;
  hasPin: boolean;
  isLocked: boolean;
  lockedUntil: string | null;
}) {
  const boundSetPin = setAdvisorPin.bind(null, advisorId);
  const [state, formAction, pending] = useActionState(boundSetPin, initialState);
  const boundUnlock = unlockAdvisorPin.bind(null, advisorId);

  return (
    <Card padding="lg" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Advisor Passcode (PIN)</h2>
        <div className="flex items-center gap-2">
          <Badge tone={hasPin ? "green" : "amber"}>{hasPin ? "PIN configured" : "No PIN set"}</Badge>
          {isLocked && <Badge tone="red">Locked</Badge>}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Required for this advisor to sign in to their workspace. The PIN itself is never stored or
        shown in plain text — only a salted hash — so it can be changed or reset, but never viewed.
      </p>

      {isLocked && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">
            Locked out after too many incorrect attempts
            {lockedUntil ? ` (until ${new Date(lockedUntil).toLocaleTimeString("en-GB")})` : ""}.
          </p>
          <form action={boundUnlock}>
            <button
              type="submit"
              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Clear lockout
            </button>
          </form>
        </div>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            {hasPin ? "New PIN" : "Set PIN"}
          </label>
          <input
            type="password"
            name="pin"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            required
            autoComplete="off"
            placeholder="• • • •"
            className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-sm tracking-[0.4em] text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : hasPin ? "Change PIN" : "Set PIN"}
        </Button>
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state.success && <span className="text-sm text-emerald-600">{state.success}</span>}
      </form>
    </Card>
  );
}

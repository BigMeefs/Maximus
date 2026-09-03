import QRCode from "qrcode";
import { getSiteOrigin } from "@/lib/site-url";
import CopyLinkButton from "@/components/copy-link-button";
import Card from "@/components/ui/card";

export default async function PortalQrCard() {
  const origin = await getSiteOrigin();
  const portalUrl = `${origin}/portal`;
  const qrDataUrl = await QRCode.toDataURL(portalUrl, { margin: 1, width: 160 });

  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI can't go through next/image's remote loader */}
      <img
        src={qrDataUrl}
        alt="QR code linking to the Participant Income Tracker Portal"
        className="h-28 w-28 shrink-0 rounded-lg border border-slate-100"
      />
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-slate-900">Participant Income Tracker Portal</h2>
        <p className="mt-1 text-xs text-slate-500">
          Print or email this QR code (or the link below) to participants. It opens a standalone page
          where they enter only their email to submit that month&apos;s income tracker — no login, and
          no access to anything else in the CRM.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="truncate rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
            {portalUrl}
          </code>
          <CopyLinkButton value={portalUrl} />
        </div>
      </div>
    </Card>
  );
}

import QRCode from "qrcode";
import { getSiteOrigin } from "@/lib/site-url";
import { getOrCreateReferralToken } from "@/lib/data/referrals";
import CopyLinkButton from "@/components/copy-link-button";

export default async function ReferralQrCard({ advisorId }: { advisorId: string }) {
  const [origin, token] = await Promise.all([getSiteOrigin(), getOrCreateReferralToken(advisorId)]);
  const referralUrl = `${origin}/referral/${token}`;
  const qrDataUrl = await QRCode.toDataURL(referralUrl, { margin: 1, width: 160 });

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI can't go through next/image's remote loader */}
      <img
        src={qrDataUrl}
        alt="QR code linking to your Self Employment Referral form"
        className="h-28 w-28 shrink-0 rounded-lg border border-slate-100"
      />
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-slate-900">Your Referral Link</h2>
        <p className="mt-1 text-xs text-slate-500">
          Share this QR code (or the link below) with colleagues so they can refer a participant to you
          for Self Employment — no Hub access needed. Referrals sent here always come to you; the
          colleague can&apos;t change that.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="truncate rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
            {referralUrl}
          </code>
          <CopyLinkButton value={referralUrl} />
        </div>
      </div>
    </section>
  );
}

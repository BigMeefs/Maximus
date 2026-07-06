import type { MonthlyEarning } from "@/types/database";
import MonthlyEarningsManager from "@/components/participant/monthly-earnings-manager";

export default function MonthlyEarningsTab({
  participantId,
  earnings,
}: {
  participantId: string;
  earnings: MonthlyEarning[];
}) {
  return (
    <MonthlyEarningsManager participantId={participantId} earnings={earnings} />
  );
}

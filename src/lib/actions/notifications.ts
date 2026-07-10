"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type NotificationActionState = {
  error?: string;
};

function revalidateNotifications() {
  revalidatePath("/advisors/[advisorId]", "layout");
  revalidatePath("/admin/notifications");
}

// The one action every notification type shares — "Mark as Reviewed /
// Completed / Actioned / Resolved" all map onto this. Never deletes the
// row; just moves it out of the active statuses so it disappears from the
// Notifications panel while staying in the audit trail.
export async function markNotificationReviewed(
  notificationId: string,
  reviewedBy: string,
): Promise<NotificationActionState> {
  const supabase = await createClient();

  const { data: notification } = await supabase
    .from("notifications")
    .select("type, related_id")
    .eq("id", notificationId)
    .maybeSingle();

  const { error } = await supabase
    .from("notifications")
    .update({ status: "Reviewed", reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) {
    return { error: error.message };
  }

  // Keep the Income Tracker tab's own "reviewed" flag in sync so reviewing
  // a submission from either surface (this panel, or the tab itself via
  // markSubmissionReviewed in actions/portal.ts) is reflected in both.
  if (notification?.type === "income_submitted" && notification.related_id) {
    await supabase
      .from("income_tracker_entries")
      .update({ reviewed: true, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
      .eq("id", notification.related_id);
  }

  revalidateNotifications();
  return {};
}

// Manager/admin action from the Notification History page — hides a
// notification from History's default view without deleting it. Distinct
// from markNotificationReviewed: this is a manager tidying up the audit
// log, not an advisor working through their queue.
export async function archiveNotification(
  notificationId: string,
  archivedBy: string,
): Promise<NotificationActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ status: "Archived", archived_by: archivedBy, archived_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) {
    return { error: error.message };
  }

  revalidateNotifications();
  return {};
}

// Undoes archiveNotification — brings it back into the active queue rather
// than trying to guess whether it was "New" or "Reviewed" beforehand.
export async function restoreNotification(notificationId: string): Promise<NotificationActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ status: "Unread", archived_by: null, archived_at: null })
    .eq("id", notificationId);

  if (error) {
    return { error: error.message };
  }

  revalidateNotifications();
  return {};
}

// Admin-only (the whole /admin section is passcode-gated — see README
// "Security model") and the only operation in this feature that actually
// deletes a row, per the spec's explicit "Permanently delete (Admin only)".
export async function deleteNotificationPermanently(notificationId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("notifications").delete().eq("id", notificationId);
  revalidateNotifications();
}

-- Removes the "Participant requires contact" notification rule and its
-- supporting Programme Setting — no longer needed (superseded by other
-- contact-tracking elsewhere in the CRM). The rest of the Notifications
-- system (0018_notifications.sql) is untouched.

delete from notifications where type = 'contact_required';

alter table programme_settings drop column if exists contact_period_days;

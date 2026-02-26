-- Migration 055: Enable Realtime for notifications table
--
-- Allows the notification bell to receive instant updates
-- instead of polling every 30 seconds.
-- Same pattern as migration 034 (drawing_analyses).
-- RLS on notifications ensures each client only receives their own rows.

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

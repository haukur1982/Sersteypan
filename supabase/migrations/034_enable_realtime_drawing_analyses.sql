-- Migration 034: Enable Realtime for drawing_analyses table
--
-- Allows the admin review UI to receive live status updates
-- instead of polling every 3 seconds.

ALTER PUBLICATION supabase_realtime ADD TABLE drawing_analyses;

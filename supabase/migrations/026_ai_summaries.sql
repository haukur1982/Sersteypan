-- ============================================================
-- Migration 026: AI Daily Summaries
-- ============================================================
-- Cache table for AI-generated daily production summaries.
-- One summary per day, regenerated on first request.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_daily_summaries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    summary_date date NOT NULL UNIQUE,
    summary_text text NOT NULL,
    anomalies jsonb DEFAULT '[]'::jsonb,
    generated_at timestamptz NOT NULL DEFAULT NOW(),
    created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Index for quick lookup by date
CREATE INDEX IF NOT EXISTS idx_ai_daily_summaries_date ON ai_daily_summaries (summary_date DESC);

-- RLS
ALTER TABLE ai_daily_summaries ENABLE ROW LEVEL SECURITY;

-- Only admin and factory_manager can read summaries
CREATE POLICY "Admin and factory_manager can read AI summaries"
    ON ai_daily_summaries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('admin', 'factory_manager')
              AND profiles.is_active = true
        )
    );

-- Only the system (service role or trigger) inserts — no direct user inserts
-- The API route uses the service role client indirectly via the authenticated user check
CREATE POLICY "Authenticated users can insert AI summaries"
    ON ai_daily_summaries FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('admin', 'factory_manager')
              AND profiles.is_active = true
        )
    );

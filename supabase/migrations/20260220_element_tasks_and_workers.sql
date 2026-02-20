-- 036_element_tasks_and_workers.sql
-- Creates tables to track specific labor tasks (e.g. rebar binding) on elements
-- and the workers associated with them for performance tracking.

CREATE TABLE IF NOT EXISTS public.element_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    element_id UUID NOT NULL REFERENCES public.elements(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL CHECK (task_type IN ('rebar', 'formwork', 'cast', 'other')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ DEFAULT now(),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure an element doesn't have multiple 'rebar' completion tasks on the same day by mistake, 
-- or just allow multiple if they iterate. We'll leave it flexible but index it.
CREATE INDEX IF NOT EXISTS idx_element_tasks_element_id ON public.element_tasks(element_id);
CREATE INDEX IF NOT EXISTS idx_element_tasks_task_type ON public.element_tasks(task_type);

CREATE TABLE IF NOT EXISTS public.element_task_workers (
    task_id UUID NOT NULL REFERENCES public.element_tasks(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    hours_spent NUMERIC(5, 2), -- Optional tracking of hours
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (task_id, worker_id)
);

-- Enable RLS
ALTER TABLE public.element_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.element_task_workers ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Policies for element_tasks
    BEGIN
        CREATE POLICY "Enable read access for authenticated users on element_tasks"
            ON public.element_tasks FOR SELECT TO authenticated USING (true);
    EXCEPTION WHEN duplicate_object THEN null; END;

    BEGIN
        CREATE POLICY "Enable insert access for authenticated users on element_tasks"
            ON public.element_tasks FOR INSERT TO authenticated WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN null; END;

    BEGIN
        CREATE POLICY "Enable update access for authenticated users on element_tasks"
            ON public.element_tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN null; END;

    BEGIN
        CREATE POLICY "Enable delete access for authenticated users on element_tasks"
            ON public.element_tasks FOR DELETE TO authenticated USING (true);
    EXCEPTION WHEN duplicate_object THEN null; END;

    -- Policies for element_task_workers
    BEGIN
        CREATE POLICY "Enable read access for authenticated users on element_task_workers"
            ON public.element_task_workers FOR SELECT TO authenticated USING (true);
    EXCEPTION WHEN duplicate_object THEN null; END;

    BEGIN
        CREATE POLICY "Enable insert access for authenticated users on element_task_workers"
            ON public.element_task_workers FOR INSERT TO authenticated WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN null; END;

    BEGIN
        CREATE POLICY "Enable delete access for authenticated users on element_task_workers"
            ON public.element_task_workers FOR DELETE TO authenticated USING (true);
    EXCEPTION WHEN duplicate_object THEN null; END;
END $$;

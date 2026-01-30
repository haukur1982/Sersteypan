# CODEX: Sprint 3 Task
**Date:** Jan 30, 2026 | **Time:** 30 min

## IMPORTANT: First commit your Sprint 2 changes!
```bash
git add -A && git commit -m "Add: Generate Report button on admin project page" && git push origin main
```

## Your Sprint 3 Mission
Create database migration for Floor Plans feature (Phase 7 prep).

## Why
Floor plans allow buyers to see element positions on building drawings.
This is the next major feature after Driver Portal.

## Tasks

### 1. Create Floor Plan Migration (20 min)
Location: `supabase/migrations/010_floor_plans.sql`

```sql
-- Floor Plans Feature Migration
-- Allows uploading floor plan images and placing elements

-- Floor Plans Table
CREATE TABLE IF NOT EXISTS floor_plans (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    floor_number INTEGER DEFAULT 1,
    image_url TEXT NOT NULL,
    width_px INTEGER,
    height_px INTEGER,
    scale_meters_per_px NUMERIC(10, 6),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Element Positions on Floor Plans
CREATE TABLE IF NOT EXISTS element_positions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    floor_plan_id UUID NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
    element_id UUID NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
    x_position INTEGER NOT NULL,  -- px from left
    y_position INTEGER NOT NULL,  -- px from top
    rotation_degrees INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(floor_plan_id, element_id)
);

-- Indexes
CREATE INDEX idx_floor_plans_project ON floor_plans(project_id);
CREATE INDEX idx_element_positions_floor_plan ON element_positions(floor_plan_id);
CREATE INDEX idx_element_positions_element ON element_positions(element_id);

-- RLS Policies
ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE element_positions ENABLE ROW LEVEL SECURITY;

-- Floor plans: same access as projects
CREATE POLICY "Users can view floor plans for their projects"
ON floor_plans FOR SELECT
USING (
    project_id IN (
        SELECT id FROM projects WHERE company_id = get_user_company()
    )
    OR get_user_role() IN ('admin', 'factory_manager')
);

CREATE POLICY "Admins can manage floor plans"
ON floor_plans FOR ALL
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

-- Element positions: same access
CREATE POLICY "Users can view element positions"
ON element_positions FOR SELECT
USING (
    floor_plan_id IN (
        SELECT fp.id FROM floor_plans fp
        JOIN projects p ON fp.project_id = p.id
        WHERE p.company_id = get_user_company()
    )
    OR get_user_role() IN ('admin', 'factory_manager')
);

CREATE POLICY "Admins can manage element positions"
ON element_positions FOR ALL
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');
```

### 2. Document Typecheck (5 min)
```bash
npx tsc --noEmit
```

### 3. Commit migration file (5 min)
```bash
git add -A && git commit -m "Add: Floor Plans migration (Phase 7 prep)" && git push origin main
```

## Success Criteria
- [ ] Sprint 2 changes committed first
- [ ] 010_floor_plans.sql created
- [ ] Tables: floor_plans, element_positions
- [ ] RLS policies added
- [ ] Commit and push

## When Done
Report: "Sprint 2 pushed. Floor plans migration created. Pushed to main."

# CODEX: Sprint 5 Task
**Date:** Jan 30, 2026 | **Time:** 30 min

## IMPORTANT: First push your pending Sprint 4 changes!
```bash
git pull origin main
git add -A && git commit -m "Add: Report API route and fixes" && git push origin main
```

## Your Sprint 5 Mission
Create floor-plans storage bucket and element positioning helpers.

## Tasks

### 1. Add floor-plans storage bucket migration (15 min)
Location: `supabase/migrations/011_floor_plans_storage.sql`

```sql
-- Floor plans storage bucket
insert into storage.buckets (id, name, public)
values ('floor-plans', 'floor-plans', true)
on conflict (id) do nothing;

-- Anyone authenticated can read floor plans
create policy "Authenticated can read floor plans"
on storage.objects for select
to authenticated
using (bucket_id = 'floor-plans');

-- Admins can manage floor plans
create policy "Admins can manage floor plans"
on storage.objects for all
to authenticated
using (bucket_id = 'floor-plans' and get_user_role() = 'admin')
with check (bucket_id = 'floor-plans' and get_user_role() = 'admin');
```

### 2. Create element positioning server action (10 min)
Location: `src/lib/floor-plans/actions.ts`

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function getFloorPlansForProject(projectId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('floor_plans')
    .select(`
      id,
      name,
      floor,
      plan_image_url,
      element_positions (
        id,
        element_id,
        x_percent,
        y_percent,
        rotation_degrees,
        elements (id, name, status, element_type)
      )
    `)
    .eq('project_id', projectId)
    .order('floor', { ascending: true })

  if (error) throw error
  return data
}

export async function saveElementPosition(
  floorPlanId: string,
  elementId: string,
  xPercent: number,
  yPercent: number,
  rotationDegrees: number = 0
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('element_positions')
    .upsert({
      floor_plan_id: floorPlanId,
      element_id: elementId,
      x_percent: xPercent,
      y_percent: yPercent,
      rotation_degrees: rotationDegrees,
    }, {
      onConflict: 'floor_plan_id,element_id'
    })

  if (error) throw error
}
```

### 3. Commit and push (5 min)
```bash
git add -A && git commit -m "Add: Floor plans storage bucket and positioning actions" && git push origin main
```

## Success Criteria
- [ ] Sprint 4 changes pushed first
- [ ] 011_floor_plans_storage.sql created
- [ ] actions.ts with getFloorPlansForProject and saveElementPosition
- [ ] Commit and push

## When Done
Report: "Floor plans storage bucket and positioning helpers created. Pushed to main."

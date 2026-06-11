'use server'

import { createClient } from '@/lib/supabase/server'
import { resolveStorageUrls } from '@/lib/storage/resolveUrl'

export async function getFloorPlansForProject(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('floor_plans')
    .select(
      `
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
    `
    )
    .eq('project_id', projectId)
    .order('floor', { ascending: true })

  if (error) throw error

  const plans = data ?? []
  // floor-plans bucket is private — resolve to signed URLs in place
  const signedUrls = await resolveStorageUrls(
    plans.map((fp) => fp.plan_image_url),
    'floor-plans'
  )
  plans.forEach((fp, i) => {
    fp.plan_image_url = signedUrls[i] ?? fp.plan_image_url
  })

  return plans
}

export async function saveElementPosition(
  floorPlanId: string,
  elementId: string,
  xPercent: number,
  yPercent: number,
  rotationDegrees: number = 0
) {
  const supabase = await createClient()

  const { error } = await supabase.from('element_positions').upsert(
    {
      floor_plan_id: floorPlanId,
      element_id: elementId,
      x_percent: xPercent,
      y_percent: yPercent,
      rotation_degrees: rotationDegrees,
    },
    {
      onConflict: 'floor_plan_id,element_id',
    }
  )

  if (error) throw error
}

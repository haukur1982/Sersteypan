export type ElementPhoto = {
  id: string
  stage: string | null
  photo_url: string
  caption: string | null
  taken_at: string | null
  created_by?: {
    full_name: string
  } | null
}

export type ElementEvent = {
  id: string
  status: string
  previous_status: string | null
  notes: string | null
  created_at: string | null
  created_by: {
    id: string
    full_name: string
  } | null
}

export type PriorityRequest = {
  id: string
  requested_priority: number
  reason: string | null
  status: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  final_priority: number | null
  review_notes: string | null
  created_at: string | null
  requested_by: {
    id: string
    full_name: string
  } | null
}

export type Element = {
  id: string
  name: string
  element_type: string
  drawing_reference: string | null
  batch_number: string | null
  floor: number | null
  position_description: string | null
  status: string | null
  priority: number | null
  rebar_completed_at: string | null
  cast_at: string | null
  curing_completed_at: string | null
  ready_at: string | null
  loaded_at: string | null
  delivered_at: string | null
  production_notes: string | null
  delivery_notes: string | null
  created_at: string | null
  photos: ElementPhoto[]
  events: ElementEvent[]
  priority_requests: PriorityRequest[]
}

export type ProjectDocument = {
  id: string
  name: string
  description: string | null
  file_url: string
  file_type: string | null
  file_size_bytes: number | null
  created_at: string | null
  profiles?: {
    id: string
    full_name: string
  } | null
}

export type ProjectMessage = {
  id: string
  message: string
  is_read: boolean | null
  created_at: string | null
  user: {
    id: string
    full_name: string
    role: string
  } | null
}

export type Project = {
  id: string
  name: string
  address: string | null
  start_date: string | null
  company: {
    id: string
    name: string
  } | null
  elements: Element[]
  documents: ProjectDocument[]
  messages: ProjectMessage[]
}

export type Delivery = {
  id: string
  truck_registration: string | null
  truck_description: string | null
  status: string | null
  planned_date: string | null
  loading_started_at: string | null
  departed_at: string | null
  arrived_at: string | null
  completed_at: string | null
  notes: string | null
  created_at: string | null
  project: {
    id: string
    name: string
    address: string | null
  } | null
  driver: {
    id: string
    full_name: string
    phone: string | null
  } | null
  items: Array<{
    id: string
    loaded_at: string | null
    delivered_at: string | null
    element: {
      id: string
      name: string
      element_type: string
    } | null
  }>
}

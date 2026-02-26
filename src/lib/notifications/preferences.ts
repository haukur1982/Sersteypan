/**
 * Notification preference types, per-role defaults, and Icelandic labels.
 *
 * Preferences are stored in profiles.preferences JSONB under the
 * "notifications" key. When a user hasn't configured preferences yet,
 * they get sensible defaults for their role.
 */

export interface NotificationPreferences {
  element_status: boolean
  delivery_status: boolean
  new_message: boolean
  priority_request: boolean
  fix_in_factory: boolean
  toast_enabled: boolean
  sound_enabled: boolean
}

type Role = 'admin' | 'factory_manager' | 'buyer' | 'driver' | 'rebar_worker'

/** Sensible defaults per role — only enable what's relevant */
const DEFAULTS: Record<Role, NotificationPreferences> = {
  admin: {
    element_status: true,
    delivery_status: true,
    new_message: true,
    priority_request: true,
    fix_in_factory: true,
    toast_enabled: true,
    sound_enabled: false,
  },
  factory_manager: {
    element_status: true,
    delivery_status: false,
    new_message: true,
    priority_request: true,
    fix_in_factory: true,
    toast_enabled: true,
    sound_enabled: false,
  },
  buyer: {
    element_status: true,
    delivery_status: true,
    new_message: true,
    priority_request: false,
    fix_in_factory: false,
    toast_enabled: true,
    sound_enabled: false,
  },
  driver: {
    element_status: false,
    delivery_status: true,
    new_message: false,
    priority_request: false,
    fix_in_factory: false,
    toast_enabled: true,
    sound_enabled: false,
  },
  rebar_worker: {
    element_status: true,
    delivery_status: false,
    new_message: false,
    priority_request: false,
    fix_in_factory: false,
    toast_enabled: true,
    sound_enabled: false,
  },
}

/** Icelandic labels and descriptions for the settings UI */
export const NOTIFICATION_TYPE_LABELS: Record<
  keyof NotificationPreferences,
  { label: string; description: string }
> = {
  element_status: {
    label: 'Staða einingar',
    description: 'Tilkynningar um breytingar á stöðu eininga',
  },
  delivery_status: {
    label: 'Afhendingar',
    description: 'Tilkynningar um afhendingar og hleðslu',
  },
  new_message: {
    label: 'Ný skilaboð',
    description: 'Tilkynningar um ný skilaboð í verkefnum',
  },
  priority_request: {
    label: 'Forgangsbeiðnir',
    description: 'Tilkynningar um forgangsbeiðnir frá kaupendum',
  },
  fix_in_factory: {
    label: 'Viðgerðir',
    description: 'Tilkynningar um viðgerðir í verksmiðju',
  },
  toast_enabled: {
    label: 'Sprettigluggar',
    description: 'Sýna sprettiglugga þegar ný tilkynning berst',
  },
  sound_enabled: {
    label: 'Hljóð',
    description: 'Spila hljóð þegar ný tilkynning berst',
  },
}

/** Which notification types are relevant per role (shown in settings UI) */
export const RELEVANT_TYPES: Record<Role, (keyof NotificationPreferences)[]> = {
  admin: [
    'element_status',
    'delivery_status',
    'new_message',
    'priority_request',
    'fix_in_factory',
    'toast_enabled',
    'sound_enabled',
  ],
  factory_manager: [
    'element_status',
    'new_message',
    'priority_request',
    'fix_in_factory',
    'toast_enabled',
    'sound_enabled',
  ],
  buyer: [
    'element_status',
    'delivery_status',
    'new_message',
    'toast_enabled',
    'sound_enabled',
  ],
  driver: ['delivery_status', 'toast_enabled', 'sound_enabled'],
  rebar_worker: ['element_status', 'toast_enabled', 'sound_enabled'],
}

/**
 * Merge stored preferences with role defaults.
 * Missing keys fall back to the role default.
 */
export function getEffectivePreferences(
  role: Role,
  stored: Record<string, boolean> | undefined
): NotificationPreferences {
  const defaults = DEFAULTS[role]
  if (!stored) return defaults
  return { ...defaults, ...stored }
}

/**
 * Check if a notification type is enabled for a user.
 * Used server-side before creating notifications.
 */
export function isNotificationTypeEnabled(
  role: Role,
  stored: Record<string, boolean> | undefined,
  type: string
): boolean {
  const prefs = getEffectivePreferences(role, stored)
  return (prefs as unknown as Record<string, boolean>)[type] ?? true
}

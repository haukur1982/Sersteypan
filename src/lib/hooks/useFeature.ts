import { useAuth } from '@/lib/hooks/useAuth'

export function useFeature(featureKey: string): boolean {
    const { user } = useAuth()

    if (!user) return false

    // Safely access nested preferences
    // Expected structure: user.preferences = { features: { visual_pilot: true } }
    const preferences = user.preferences || {}
    const features = preferences.features || {}

    return features[featureKey] === true
}

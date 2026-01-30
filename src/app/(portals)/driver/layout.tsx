import { OfflineBanner } from '@/components/driver/OfflineBanner'

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <OfflineBanner />
      {children}
    </>
  )
}

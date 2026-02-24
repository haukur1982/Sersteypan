import { FactoryScanClient } from './FactoryScanClient'

export default function FactoryScanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Skanna QR k&oacute;&eth;a
        </h1>
        <p className="text-zinc-600 mt-1">
          Bein&eth;u myndav&eacute;linni a&eth; QR k&oacute;&eth;a &aacute; einingu til a&eth; uppf&aelig;ra st&ouml;&eth;u
        </p>
      </div>
      <FactoryScanClient />
    </div>
  )
}

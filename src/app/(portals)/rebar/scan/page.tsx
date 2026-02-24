import { RebarScanClient } from './RebarScanClient'

export default function RebarScanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Skanna QR kóða
        </h1>
        <p className="text-zinc-600 mt-1">
          Beindu myndavélinni að QR kóða á einingu
        </p>
      </div>
      <RebarScanClient />
    </div>
  )
}

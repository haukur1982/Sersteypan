import { HelpContent } from '@/components/shared/HelpContent'

export default function FactoryHelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hjálp</h1>
        <p className="text-zinc-600 mt-1">Leiðbeiningar fyrir verkstjóra</p>
      </div>
      <HelpContent role="factory_manager" />
    </div>
  )
}

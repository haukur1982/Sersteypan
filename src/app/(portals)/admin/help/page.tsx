import { HelpContent } from '@/components/shared/HelpContent'

export default function AdminHelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hjálp</h1>
        <p className="text-zinc-600 mt-1">Leiðbeiningar fyrir stjórnendur</p>
      </div>
      <HelpContent role="admin" />
    </div>
  )
}

import { Card } from '@/components/ui/card'
import { Construction, QrCode, CheckSquare, HelpCircle } from 'lucide-react'

export default function RebarHelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Hjálp
        </h1>
        <p className="text-zinc-600 mt-1">
          Leiðbeiningar fyrir járnabindingarsíðuna
        </p>
      </div>

      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <Construction className="w-8 h-8 text-amber-600 shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-lg text-zinc-900">Hefja járnabindingu</h3>
              <p className="text-zinc-600 mt-1">
                Farðu á verkefnasíðuna og ýttu á &quot;Hefja&quot; hnappinn á einingunum
                sem þarfnast járnabindingar. Þá færist einingin í stöðuna
                &quot;Í vinnslu&quot;.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-4">
            <QrCode className="w-8 h-8 text-blue-600 shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-lg text-zinc-900">Skanna QR kóða</h3>
              <p className="text-zinc-600 mt-1">
                Beindu myndavélinni á spjaldtölvunni að QR kóðanum á einingunni.
                Þá birtist einingin og þú getur hafið eða haldið áfram með
                járnabindingu.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-4">
            <CheckSquare className="w-8 h-8 text-green-600 shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-lg text-zinc-900">Gátlisti og ljúka</h3>
              <p className="text-zinc-600 mt-1">
                Á upplýsingasíðu einingarinnar geturðu hakað við gátlistann.
                Þegar þú ert búinn, ýttu á græna hnappinn &quot;Járnabinding lokið&quot;
                neðst á síðunni.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-4">
            <HelpCircle className="w-8 h-8 text-zinc-500 shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-lg text-zinc-900">Aðstoð</h3>
              <p className="text-zinc-600 mt-1">
                Ef þú lendir í vandræðum skaltu hafa samband við verksmiðjustjóra.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

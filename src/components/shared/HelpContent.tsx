'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Lightbulb,
  AlertTriangle,
  Building,
  Users,
  FileSearch,
  BarChart3,
  Layers,
  Factory,
  Wrench,
  BookOpen,
  Truck,
  QrCode,
  WifiOff,
  Eye,
  Flag,
  ChevronDown,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

type Role = 'admin' | 'factory_manager' | 'buyer' | 'driver'

// ---------------------------------------------------------------------------
// Reusable building blocks
// ---------------------------------------------------------------------------

function Tip({ children }: { children: ReactNode }) {
  return (
    <Alert className="bg-blue-50 border-blue-200">
      <Lightbulb className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800 text-sm">
        {children}
      </AlertDescription>
    </Alert>
  )
}

function Warning({ children }: { children: ReactNode }) {
  return (
    <Alert className="bg-amber-50 border-amber-200">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800 text-sm">
        {children}
      </AlertDescription>
    </Alert>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold">
        {n}
      </div>
      <div className="text-sm text-zinc-700 pt-1 flex-1">{children}</div>
    </div>
  )
}

function StepList({ children }: { children: ReactNode }) {
  return <div className="space-y-3">{children}</div>
}

function FieldGrid({ fields }: { fields: { name: string; required?: boolean; note?: string }[] }) {
  return (
    <div className="rounded-lg border border-zinc-200 overflow-hidden text-sm">
      {fields.map((f, i) => (
        <div
          key={f.name}
          className={`flex items-center gap-2 px-3 py-2.5 ${i % 2 === 0 ? 'bg-zinc-50/50' : 'bg-white'}`}
        >
          <span className="font-medium text-zinc-800 min-w-0">{f.name}</span>
          {f.required && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-red-200 text-red-600">
              skylt
            </Badge>
          )}
          {f.note && <span className="text-zinc-400 text-xs ml-auto whitespace-nowrap">{f.note}</span>}
        </div>
      ))}
    </div>
  )
}

function WorkflowSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-zinc-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
      >
        <span className="font-semibold text-sm text-zinc-800">{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-4 py-4 space-y-4">{children}</div>}
    </div>
  )
}

function QuickCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-4 rounded-lg border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50 transition-all text-left w-full group"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-zinc-100 group-hover:bg-zinc-200 flex items-center justify-center transition-colors">
        <Icon className="h-5 w-5 text-zinc-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-zinc-900">{title}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-zinc-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left border-b border-zinc-100 pb-3 last:border-0 last:pb-0"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-sm text-zinc-900">{q}</p>
        <ChevronDown
          className={`h-3.5 w-3.5 text-zinc-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>
      {open && <p className="text-sm text-zinc-600 mt-2">{a}</p>}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Role-specific overview cards
// ---------------------------------------------------------------------------

type WorkflowMeta = { icon: LucideIcon; title: string; description: string }

const overviews: Record<Role, { title: string; description: string }> = {
  admin: {
    title: 'Stjórnandagátt',
    description: 'Þú sérð allt: fyrirtæki, verkefni, notendur, einingar, afhendingar og skýrslur.',
  },
  factory_manager: {
    title: 'Verksmiðjugátt',
    description: 'Þú stýrir framleiðslunni: steypulotur, gátlistar, stöðubreytingar, lagfæringar og lager.',
  },
  buyer: {
    title: 'Kaupandagátt',
    description: 'Þú sérð verkefnin þín, fylgist með framgangi eininga og afhendinga.',
  },
  driver: {
    title: 'Bílstjóragátt',
    description: 'Þú stofnar afhendingar, skannar QR kóða og lýkur afhendingu með undirskrift.',
  },
}

const workflowMetas: Record<Role, WorkflowMeta[]> = {
  admin: [
    { icon: Building, title: 'Stofna fyrirtæki og verkefni', description: 'Fyrirtæki → verkefni → einingar' },
    { icon: Users, title: 'Stofna notanda', description: 'Búa til aðgang og úthluta hlutverki' },
    { icon: FileSearch, title: 'Greina teikningu með AI', description: 'Hlaða upp PDF og láta AI draga út einingar' },
    { icon: BarChart3, title: 'Skoða skýrslur', description: 'Framleiðsla, afhendingar, gæði' },
  ],
  factory_manager: [
    { icon: Layers, title: 'Steypulotur', description: 'Stofna lotu, gátlisti, ljúka steypingu' },
    { icon: Factory, title: 'Uppfæra stöðu einingar', description: 'Færa einingu á milli framleiðslustiga' },
    { icon: Wrench, title: 'Lagfæringar', description: 'Skrá galla, ljúka viðgerð' },
    { icon: BookOpen, title: 'Dagleg skráning', description: 'Dagbók, verkefnalisti, lager' },
  ],
  buyer: [
    { icon: Eye, title: 'Fylgjast með verkefni', description: 'Einingar, afhendingar, skjöl, skilaboð' },
    { icon: Flag, title: 'Óska forgangs', description: 'Senda beiðni um hraðari framleiðslu' },
    { icon: Truck, title: 'Fylgjast með afhendingu', description: 'Tímalína frá áætlun til afhendingar' },
  ],
  driver: [
    { icon: QrCode, title: 'Hlaða á bíl', description: 'Stofna afhendingu og skanna einingar' },
    { icon: Truck, title: 'Ljúka afhendingu', description: 'Merkja komu, undirskrift, mynd' },
    { icon: WifiOff, title: 'Ónettengdur stuðningur', description: 'Hvað virkar án internets' },
  ],
}

// ---------------------------------------------------------------------------
// Workflow content per role
// ---------------------------------------------------------------------------

const Q = '\u201e' // „
const QE = '\u201c' // "

function AdminWorkflows() {
  return (
    <div className="space-y-3">
      <WorkflowSection title="Stofna fyrirtæki, verkefni og einingar" defaultOpen>
        <p className="text-sm text-zinc-600">Þetta er grunnuppsetningin — fyrirtæki → verkefni → einingar.</p>

        <h4 className="text-sm font-semibold text-zinc-800">1. Stofna fyrirtæki</h4>
        <p className="text-sm text-zinc-500 mb-2">
          <Badge variant="outline" className="text-[11px]">Fyrirtæki</Badge> → <strong>+ Nýtt fyrirtæki</strong>
        </p>
        <FieldGrid fields={[
          { name: 'Nafn fyrirtækis', required: true },
          { name: 'Tengiliður', required: true },
          { name: 'Tölvupóstur', required: true },
          { name: 'Kennitala', note: '000000-0000' },
          { name: 'Símanúmer', note: '+354 ...' },
        ]} />

        <h4 className="text-sm font-semibold text-zinc-800">2. Stofna verkefni</h4>
        <p className="text-sm text-zinc-500 mb-2">
          <Badge variant="outline" className="text-[11px]">Verkefni</Badge> → <strong>+ Nýtt verkefni</strong>
        </p>
        <FieldGrid fields={[
          { name: 'Nafn verkefnis', required: true, note: 't.d. Eddufell 6' },
          { name: 'Fyrirtæki', required: true, note: 'velja úr lista' },
          { name: 'Staða', required: true, note: 'Virkt / Skipulagt / Lokið' },
        ]} />

        <h4 className="text-sm font-semibold text-zinc-800">3. Stofna einingar</h4>
        <p className="text-sm text-zinc-500 mb-2">
          Opnaðu verkefni → <strong>+ Ný eining</strong>
        </p>
        <FieldGrid fields={[
          { name: 'Nafn', required: true, note: 't.d. F-13' },
          { name: 'Tegund', required: true, note: 'Filigran, Veggur, Stigi...' },
          { name: 'Lengd / breidd / hæð (mm)' },
          { name: 'Þyngd (kg)', note: 'reiknast sjálfkrafa' },
          { name: 'Járnauppsetning', note: 't.d. K10 c/c 200' },
        ]} />
        <Tip>Ef þú slærð inn mál reiknast þyngd sjálfkrafa. Smelltu á {Q}Nota reiknuð þyngd{QE}.</Tip>
      </WorkflowSection>

      <WorkflowSection title="Stofna notanda">
        <p className="text-sm text-zinc-500 mb-2">
          <Badge variant="outline" className="text-[11px]">Notendur</Badge> → <strong>+ Nýr notandi</strong>
        </p>
        <FieldGrid fields={[
          { name: 'Fullt nafn', required: true },
          { name: 'Netfang', required: true, note: 'verður notandanafn' },
          { name: 'Lykilorð', required: true, note: 'minnst 6 stafir' },
          { name: 'Hlutverk', required: true, note: 'Admin / Verkstjóri / Kaupandi / Bílstjóri' },
          { name: 'Fyrirtæki', note: 'skylt ef hlutverk = Kaupandi' },
        ]} />
      </WorkflowSection>

      <WorkflowSection title="Greina teikningu með AI">
        <p className="text-sm text-zinc-600 mb-3">
          AI les PDF teikningu og dregur sjálfkrafa út einingar (nöfn, mál, þyngd, járn, magn).
        </p>
        <StepList>
          <Step n={1}>Opnaðu verkefni → <strong>Greina teikningar</strong></Step>
          <Step n={2}>Dragðu PDF skjal inn á svæðið, eða smelltu á <strong>Velja skjöl</strong></Step>
          <Step n={3}>Smelltu á <strong>Hlaða upp og greina</strong></Step>
          <Step n={4}>Bíddu — greining tekur 30–60 sekúndur</Step>
          <Step n={5}>Þegar lokið: smelltu á <strong>Yfirfara</strong> á greiningarspjaldinu</Step>
          <Step n={6}>Farðu yfir töfluna — smelltu á hvern reit til að breyta ef þarf</Step>
          <Step n={7}>Hakið við einingarnar sem á að stofna</Step>
          <Step n={8}>Smelltu á <strong>Stofna valdar einingar</strong></Step>
        </StepList>
        <Tip>Litakóðar: rautt = lítið öryggi (AI var óviss), gult = miðlungs, appelsínugult = nafn þegar til.</Tip>
        <Warning>Ef greining mistókst birtist villuskilaboð á spjaldinu. Reyndu aftur eða hlaðið upp öðru skjali.</Warning>
      </WorkflowSection>

      <WorkflowSection title="Skoða skýrslur">
        <p className="text-sm text-zinc-500 mb-2">
          <Badge variant="outline" className="text-[11px]">Skýrslur</Badge>
        </p>
        <StepList>
          <Step n={1}>Veldu tímabil: 7 dagar / 30 dagar / 90 dagar / Allt</Step>
          <Step n={2}>
            <span>Skoðaðu 4 flipa:</span>
            <ul className="list-disc list-inside mt-1.5 space-y-1 text-zinc-600 text-sm">
              <li><strong>Framleiðsla</strong> — vikuleg framleiðni, ferlatímagreining</li>
              <li><strong>Afhendingar</strong> — fjöldi, meðallengd, hlutfall á tíma</li>
              <li><strong>Gæði</strong> — gallatíðni, höfnunarhlutfall</li>
              <li><strong>Yfirlit</strong> — framgangur hvers verkefnis</li>
            </ul>
          </Step>
        </StepList>
      </WorkflowSection>
    </div>
  )
}

function FactoryWorkflows() {
  return (
    <div className="space-y-3">
      <WorkflowSection title="Stofna steypulotu og ljúka henni" defaultOpen>
        <h4 className="text-sm font-semibold text-zinc-800">Stofna lotu</h4>
        <p className="text-sm text-zinc-500 mb-2">
          <Badge variant="outline" className="text-[11px]">Steypulotur</Badge> → <strong>Stofna steypulotu</strong>
        </p>
        <FieldGrid fields={[
          { name: 'Steypuverksmiðja', note: 't.d. BM Vallá' },
          { name: 'Steypustyrkur', note: 't.d. C30/37' },
          { name: 'Hitastig (°C)', note: 't.d. 12.5' },
        ]} />
        <p className="text-sm text-zinc-600 mt-2">
          Veldu einingar í flipum eftir tegund (Filigran, Svalir, Stigi...).
          Einingar flokkaðar eftir hæð. Aðeins {Q}Skipulagt{QE} og {Q}Járnabundið{QE} einingar birtast.
        </p>

        <h4 className="text-sm font-semibold text-zinc-800">Gátlisti — 12 liðir</h4>
        <p className="text-sm text-zinc-600">
          Á lotusíðunni eru 12 gátlistaliðir (formolía, járnaskoðun, steypustyrkur, hitastig, o.s.frv.)
          sem <strong>allir verða</strong> að vera hakað áður en hægt er að ljúka lotunni.
        </p>
        <Warning>
          Rauð viðvörun birtist efst ef gátlisti er ólokinn.
          Hnappurinn {Q}Ljúka steypulotu{QE} virkist ekki fyrr en allt er hakað.
        </Warning>

        <h4 className="text-sm font-semibold text-zinc-800">Ljúka lotu</h4>
        <StepList>
          <Step n={1}>Smelltu á <strong>Ljúka steypulotu</strong></Step>
          <Step n={2}>Staðfestu í glugga sem birtist</Step>
          <Step n={3}>Allar einingar í lotunni breytast sjálfkrafa í {Q}Steypt{QE}</Step>
        </StepList>
      </WorkflowSection>

      <WorkflowSection title="Uppfæra stöðu einingar">
        <p className="text-sm text-zinc-500 mb-2">
          <Badge variant="outline" className="text-[11px]">Framleiðsla</Badge> → smelltu á einingu
        </p>
        <div className="flex items-center gap-1.5 text-xs text-zinc-600 mb-3 flex-wrap">
          <Badge variant="secondary" className="bg-zinc-100 text-[11px]">Skipulagt</Badge>
          <span>→</span>
          <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-[11px]">Járnab.</Badge>
          <span>→</span>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[11px]">Steypt</Badge>
          <span>→</span>
          <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-[11px]">Þornar</Badge>
          <span>→</span>
          <Badge variant="secondary" className="bg-green-100 text-green-800 text-[11px]">Tilbúið</Badge>
          <span>→</span>
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[11px]">Á bíl</Badge>
          <span>→</span>
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-[11px]">Afhent</Badge>
        </div>
        <StepList>
          <Step n={1}>Veldu næstu stöðu úr fellivalmyndinni</Step>
          <Step n={2}>Bættu við athugasemdum og mynd ef þú vilt (valkvæmt)</Step>
          <Step n={3}>Smelltu á <strong>Uppfæra stöðu</strong></Step>
        </StepList>
        <Tip>
          {Q}Steypt{QE} fá einingar sjálfkrafa þegar steypulotu er lokið — ekki þarf handvirka uppfærslu.
        </Tip>
      </WorkflowSection>

      <WorkflowSection title="Skrá og ljúka lagfæringu">
        <h4 className="text-sm font-semibold text-zinc-800">Skrá galla</h4>
        <p className="text-sm text-zinc-500 mb-2">
          <Badge variant="outline" className="text-[11px]">Viðgerðir</Badge> → <strong>+ Ný lagfæring</strong>
        </p>
        <FieldGrid fields={[
          { name: 'Lýsing vandamáls', required: true },
          { name: 'Grunnorsök' },
          { name: 'Flokkur', note: 'Efni / Samsetning / Hönnun / Annað' },
          { name: 'Forgangur', note: 'Lágur / Venjulegur / Hár / Mjög brýnt' },
          { name: 'Hefur áhrif á afhendingu', note: 'hakreitur' },
        ]} />
        <p className="text-sm text-zinc-600 mt-2">
          Hægt er að hlaða upp allt að 5 myndum af gallanum.
        </p>

        <h4 className="text-sm font-semibold text-zinc-800">Ljúka lagfæringu</h4>
        <StepList>
          <Step n={1}>Smelltu á <strong>Ljúka</strong> á lagfæringarspjaldinu</Step>
          <Step n={2}>Fylltu út {Q}Hvað var gert til að laga{QE} (skylt)</Step>
          <Step n={3}>Smelltu á <strong>Merkja sem lokið</strong></Step>
        </StepList>
      </WorkflowSection>

      <WorkflowSection title="Dagleg skráning (dagbók, verkefnalisti, lager)">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-zinc-800 mb-1">Dagbók</h4>
            <p className="text-sm text-zinc-600">
              <Badge variant="outline" className="text-[11px]">Dagbók</Badge> → <strong>+ Ný færsla</strong> — Dagsetning, titill, innihald (skylt), verkefni.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-800 mb-1">Verkefnalisti</h4>
            <p className="text-sm text-zinc-600">
              <Badge variant="outline" className="text-[11px]">Verkefnalisti</Badge> → <strong>+ Nýtt verkefni</strong> — Titill (skylt), lýsing, gjalddagi. Merktu lokið með gátreit.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-800 mb-1">Lager</h4>
            <p className="text-sm text-zinc-600">
              <Badge variant="outline" className="text-[11px]">Lager</Badge> — Birgðayfirlit, inn/út hreyfingar, viðvörun ef vara fer undir endurpantanamörk.
            </p>
          </div>
        </div>
      </WorkflowSection>
    </div>
  )
}

function BuyerWorkflows() {
  return (
    <div className="space-y-3">
      <WorkflowSection title="Fylgjast með verkefni" defaultOpen>
        <p className="text-sm text-zinc-500 mb-2">
          <Badge variant="outline" className="text-[11px]">Verkefni</Badge> → smelltu á verkefni
        </p>
        <p className="text-sm text-zinc-600 mb-3">Verkefnaítarsíðan hefur 5 flipa:</p>
        <div className="space-y-2 text-sm text-zinc-600">
          <p>📋 <strong>Einingar</strong> — Tafla, sía eftir stöðu, smelltu á einingu til að sjá ferilslínu og myndir</p>
          <p>🏗️ <strong>3D Yfirlit</strong> — Hæðarteikningar með staðsettum einingum</p>
          <p>🚚 <strong>Afhendingar</strong> — Tímalína afhendinga</p>
          <p>📄 <strong>Skjöl</strong> — Teikningar, armeringsmyndir, steypuskýrslur</p>
          <p>💬 <strong>Skilaboð</strong> — Senda skilaboð, hægt að tengja við einingu</p>
        </div>
      </WorkflowSection>

      <WorkflowSection title="Óska forgangs á einingu">
        <StepList>
          <Step n={1}>Opnaðu verkefni → Einingar flipinn</Step>
          <Step n={2}>Smelltu á <strong>Óska forgangs</strong> við eininguna</Step>
          <Step n={3}>Veldu forgangsstig (1–10, hærra = meiri forgangur)</Step>
          <Step n={4}>Skrifaðu ástæðu (skylt, max 500 stafir)</Step>
          <Step n={5}>Smelltu á <strong>Senda beiðni</strong></Step>
        </StepList>
        <Tip>Beiðnin fer til verksmiðjunnar. Staða: Í vinnslu / Samþykkt / Hafnað.</Tip>
      </WorkflowSection>

      <WorkflowSection title="Fylgjast með afhendingu">
        <p className="text-sm text-zinc-500 mb-2">
          <Badge variant="outline" className="text-[11px]">Afhendingar</Badge> → smelltu á afhendingu
        </p>
        <div className="flex items-center gap-1.5 text-xs text-zinc-600 mb-3 flex-wrap">
          <Badge variant="secondary" className="bg-zinc-100 text-[11px]">Áætlað</Badge>
          <span>→</span>
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[11px]">Í hleðslu</Badge>
          <span>→</span>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[11px]">Á leiðinni</Badge>
          <span>→</span>
          <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-[11px]">Á staðnum</Badge>
          <span>→</span>
          <Badge variant="secondary" className="bg-green-100 text-green-800 text-[11px]">Afhent</Badge>
        </div>
        <p className="text-sm text-zinc-600">
          Þegar lokið sérðu nafn viðtakanda, undirskrift og ljósmynd.
        </p>
      </WorkflowSection>
    </div>
  )
}

function DriverWorkflows() {
  return (
    <div className="space-y-3">
      <WorkflowSection title="Stofna afhendingu og hlaða á bíl" defaultOpen>
        <h4 className="text-sm font-semibold text-zinc-800">1. Stofna afhendingu</h4>
        <p className="text-sm text-zinc-500 mb-2">
          <Badge variant="outline" className="text-[11px]">Afhendingar</Badge> → <strong>Ný afhending</strong>
        </p>
        <FieldGrid fields={[
          { name: 'Verkefni', required: true, note: 'velja úr lista' },
          { name: 'Bílnúmer', required: true, note: 't.d. AB-123' },
          { name: 'Lýsing', note: 't.d. Hvítur Volvo' },
        ]} />

        <h4 className="text-sm font-semibold text-zinc-800">2. Skanna einingar</h4>
        <StepList>
          <Step n={1}>Smelltu á <strong>Skanna einingu til að bæta við</strong></Step>
          <Step n={2}>Beindu myndavélinni að QR kóða á einingunni</Step>
          <Step n={3}>Kerfið athugar stöðu — aðeins {Q}Tilbúið{QE} einingar geta farið á bíl</Step>
          <Step n={4}>Smelltu á <strong>Hlaða á bíl</strong></Step>
        </StepList>
        <Tip>
          Ef QR kóðinn er ólesanlegur: smelltu á {Q}Slá inn númer handvirkt{QE} og leitaðu eftir nafni.
        </Tip>

        <h4 className="text-sm font-semibold text-zinc-800">3. Hefja akstur</h4>
        <p className="text-sm text-zinc-600">
          Þegar allar einingar eru á bíl, smelltu á <strong>Hefja afhendingu</strong>.
        </p>
      </WorkflowSection>

      <WorkflowSection title="Ljúka afhendingu á staðnum">
        <StepList>
          <Step n={1}>
            <strong>Merkja komu</strong> — Smelltu á {Q}Merkja komu á staðinn{QE}
          </Step>
          <Step n={2}>
            <strong>Staðfesta einingar</strong> — Smelltu á hverja einingu til að staðfesta
          </Step>
          <Step n={3}>
            <strong>Nafn móttakanda</strong> — Skrifaðu nafn þess sem tekur við (skylt)
          </Step>
          <Step n={4}>
            <strong>Undirskrift</strong> — Viðtakandi undirritar á skjánum (skylt)
          </Step>
          <Step n={5}>
            <strong>Mynd</strong> — Taktu ljósmynd af afhendingunni (valkvæmt)
          </Step>
          <Step n={6}>
            Smelltu á <strong>Staðfesta afhendingu</strong>
          </Step>
        </StepList>
        <Tip>
          Allar einingar verða merktar {Q}Afhent{QE} sjálfkrafa og afhending merkt lokið.
        </Tip>
      </WorkflowSection>

      <WorkflowSection title="Ónettengdur stuðningur (Offline)">
        <p className="text-sm text-zinc-600 mb-3">
          Bílstjóragáttin virkar án internettengingar:
        </p>
        <div className="space-y-2.5 text-sm text-zinc-600">
          <div className="flex gap-2">
            <span className="text-zinc-400">•</span>
            <span>Þegar nettenging dettur safnast aðgerðir í biðröð</span>
          </div>
          <div className="flex gap-2">
            <span className="text-zinc-400">•</span>
            <span>Gult borði efst á skjánum sýnir fjölda aðgerða í bið</span>
          </div>
          <div className="flex gap-2">
            <span className="text-zinc-400">•</span>
            <span>Þegar tenging kemst á sendast aðgerðir sjálfkrafa</span>
          </div>
          <div className="flex gap-2">
            <span className="text-zinc-400">•</span>
            <span>Ef samstilling mistekst: smelltu á {Q}Reyna aftur{QE}</span>
          </div>
        </div>
        <Warning>
          Offline virkar fyrir: hlaða á bíl, fjarlægja af bíl, staðfesta einingar, hefja akstur, ljúka afhendingu.
        </Warning>
      </WorkflowSection>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FAQ content
// ---------------------------------------------------------------------------

const sharedFaq = [
  { q: 'Hvernig skrái ég mig inn?', a: 'Opnaðu kerfið í vafra, sláðu inn netfang og lykilorð, og smelltu á Innskrá. Kerfið vísar þér á rétta gátt.' },
  { q: 'Hvernig skrái ég mig út?', a: 'Smelltu á Útskrá neðst í hliðarvalmyndinni.' },
  { q: 'Hvað geri ég ef ég gleymi lykilorðinu?', a: 'Hafðu samband við stjórnanda (admin) sem getur endurstillt lykilorðið þitt.' },
  { q: 'Hvernig virka QR kóðar?', a: 'Stjórnandi prentar QR kóða fyrir einingar í verkefni. Bílstjóri skannar þá til að hlaða einingum á bíl.' },
  { q: 'Hvernig virka tilkynningar?', a: 'Tilkynningar birtast með bjölluhnappnum efst á síðunni. Engar tilkynningar eru sendar í tölvupósti — þú þarft að vera innskráð/ur.' },
]

const roleFaq: Record<Role, { q: string; a: string }[]> = {
  admin: [
    { q: 'Hvernig laga ég gölluð AI gögn?', a: 'Á yfirferðarsíðunni geturðu smellt á hvern reit til að breyta honum beint í töflunni. Rauðar línur hafa lítið öryggi — farðu vel yfir þær.' },
    { q: 'Hvernig prenta ég QR kóða?', a: 'Opnaðu verkefni → QR merki → smelltu á Prenta.' },
  ],
  factory_manager: [
    { q: 'Af hverju get ég ekki lokið steypulotu?', a: 'Allir 12 gátlistaliðir verða að vera hakað. Ólokið atriði sýna rauða viðvörun efst á lotusíðunni.' },
    { q: 'Hvernig bakka ég stöðubreytingu?', a: 'Opnaðu eininguna og veldu fyrri stöðu — kerfið leyfir eitt skref aftur á bak.' },
  ],
  buyer: [
    { q: 'Get ég breytt einhverju?', a: 'Kaupandagáttin er til lestrar. Þú getur óskað forgangs og sent skilaboð, en ekki breytt gögnum.' },
    { q: 'Hvernig veit ég að afhending er á leiðinni?', a: 'Tímalínan á afhendingarítarsíðu sýnir stöðu í rauntíma — þú sérð hvenær bílstjóri byrjaði akstur.' },
  ],
  driver: [
    { q: 'Hvað ef QR kóðinn er skemmdur?', a: 'Smelltu á "Slá inn númer handvirkt" á skannasíðunni og leitaðu eftir einingarnafni.' },
    { q: 'Hvað ef nettenging dettur á meðan ég er að afhenda?', a: 'Aðgerðir safnast í biðröð (gult borði sýnir fjölda). Þegar tenging kemst á eru þær sendar sjálfkrafa.' },
  ],
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const workflowRenderers: Record<Role, () => ReactNode> = {
  admin: AdminWorkflows,
  factory_manager: FactoryWorkflows,
  buyer: BuyerWorkflows,
  driver: DriverWorkflows,
}

export function HelpContent({ role }: { role: Role }) {
  const [activeTab, setActiveTab] = useState('overview')
  const overview = overviews[role]
  const metas = workflowMetas[role]
  const Workflows = workflowRenderers[role]
  const faqs = [...sharedFaq, ...roleFaq[role]]

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="overview">Yfirlit</TabsTrigger>
        <TabsTrigger value="workflows">Verkflæði</TabsTrigger>
        <TabsTrigger value="faq">Algengar spurningar</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6 mt-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{overview.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-600 mb-6">{overview.description}</p>
            <h3 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider mb-3">
              Verkflæði
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {metas.map((m) => (
                <QuickCard
                  key={m.title}
                  icon={m.icon}
                  title={m.title}
                  description={m.description}
                  onClick={() => setActiveTab('workflows')}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="workflows" className="mt-4">
        <Workflows />
      </TabsContent>

      <TabsContent value="faq" className="space-y-6 mt-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Algengar spurningar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

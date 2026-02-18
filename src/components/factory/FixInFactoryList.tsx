'use client'

import { useState, useTransition } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { AlertTriangle, ChevronDown, ChevronUp, Camera } from 'lucide-react'
import { DefectPhotoUpload } from './DefectPhotoUpload'
import {
    createFixRequest,
    updateFixStatus,
    type FixStatus,
    type FixPriority,
    type FixCategory,
    type FixRequestRecord
} from '@/lib/factory/fix-factory-actions'

interface FixInFactoryListProps {
    requests: FixRequestRecord[]
    elementId?: string
    projectId?: string
}

const statusLabels: Record<string, string> = {
    pending: 'I bið',
    in_progress: 'I vinnslu',
    completed: 'Lokið',
    cancelled: 'Hætt við',
}

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-zinc-100 text-zinc-600',
}

const priorityLabels: Record<string, string> = {
    low: 'Lagur',
    normal: 'Venjulegur',
    high: 'Har',
    urgent: 'Mjog brynt',
}

const priorityColors: Record<string, string> = {
    low: 'bg-zinc-100 text-zinc-700',
    normal: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
}

const categoryLabels: Record<string, string> = {
    material: 'Efni',
    assembly: 'Samsetning',
    design: 'Honnun',
    transport: 'Flutningur',
    other: 'Annad',
}

export function FixInFactoryList({ requests, elementId, projectId }: FixInFactoryListProps) {
    const [isPending, startTransition] = useTransition()
    const [isCreating, setIsCreating] = useState(false)
    const [issueDescription, setIssueDescription] = useState('')
    const [priority, setPriority] = useState<FixPriority>('normal')
    const [category, setCategory] = useState<FixCategory>('other')
    const [deliveryImpact, setDeliveryImpact] = useState(false)
    const [rootCause, setRootCause] = useState('')
    const [resolutionNotes, setResolutionNotes] = useState('')
    const [correctiveAction, setCorrectiveAction] = useState('')
    const [lessonsLearned, setLessonsLearned] = useState('')
    const [completingId, setCompletingId] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const handleCreate = async () => {
        if (!issueDescription.trim()) return

        startTransition(async () => {
            const result = await createFixRequest({
                issue_description: issueDescription,
                priority,
                category,
                delivery_impact: deliveryImpact,
                root_cause: rootCause || undefined,
                element_id: elementId,
                project_id: projectId,
            })

            if (result.success) {
                setIsCreating(false)
                setIssueDescription('')
                setPriority('normal')
                setCategory('other')
                setDeliveryImpact(false)
                setRootCause('')
            }
        })
    }

    const handleStatusChange = async (requestId: string, newStatus: FixStatus) => {
        if (newStatus === 'completed') {
            setCompletingId(requestId)
            return
        }

        startTransition(async () => {
            await updateFixStatus(requestId, newStatus)
        })
    }

    const handleComplete = async (requestId: string) => {
        startTransition(async () => {
            await updateFixStatus(
                requestId,
                'completed',
                resolutionNotes,
                correctiveAction,
                lessonsLearned
            )
            setCompletingId(null)
            setResolutionNotes('')
            setCorrectiveAction('')
            setLessonsLearned('')
        })
    }

    const deliveryBlockers = requests.filter(r => r.delivery_impact && r.status !== 'completed' && r.status !== 'cancelled')

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-zinc-900">Lagfæringar (Fix Requests)</h2>
                    {deliveryBlockers.length > 0 && (
                        <Badge variant="secondary" className="bg-red-100 text-red-800 gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {deliveryBlockers.length} hefta afhendingu
                        </Badge>
                    )}
                </div>
                <Dialog open={isCreating} onOpenChange={setIsCreating}>
                    <DialogTrigger asChild>
                        <Button>+ Ný lagfæring</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Skrá lagfæringu</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Lýsing vandamáls *</Label>
                                <Textarea
                                    value={issueDescription}
                                    onChange={(e) => setIssueDescription(e.target.value)}
                                    placeholder="Lýstu vandamálinu..."
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Grunnorsök — Hvað olli vandamálinu?</Label>
                                <Textarea
                                    value={rootCause}
                                    onChange={(e) => setRootCause(e.target.value)}
                                    placeholder="t.d. Röng mál á teikningu, efnislega galli..."
                                    rows={2}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Flokkur</Label>
                                    <Select value={category} onValueChange={(v) => setCategory(v as FixCategory)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(categoryLabels).map(([key, label]) => (
                                                <SelectItem key={key} value={key}>{label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Forgangur</Label>
                                    <Select value={priority} onValueChange={(v) => setPriority(v as FixPriority)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(priorityLabels).map(([key, label]) => (
                                                <SelectItem key={key} value={key}>{label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id="delivery-impact"
                                    checked={deliveryImpact}
                                    onCheckedChange={(checked) => setDeliveryImpact(checked === true)}
                                />
                                <Label htmlFor="delivery-impact" className="text-sm cursor-pointer">
                                    Hefur áhrif á afhendingu (Blocks delivery)
                                </Label>
                            </div>
                            <Button
                                onClick={handleCreate}
                                disabled={isPending || !issueDescription.trim()}
                                className="w-full"
                            >
                                {isPending ? 'Vista...' : 'Skrá lagfæringu'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Completion dialog with corrective action + lessons learned */}
            <Dialog open={!!completingId} onOpenChange={() => setCompletingId(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Ljúka lagfæringu</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Hvað var gert til að laga? *</Label>
                            <Textarea
                                value={correctiveAction}
                                onChange={(e) => setCorrectiveAction(e.target.value)}
                                placeholder="Lýstu hvað var gert til að lagfæra vandamálið..."
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Hvað má gera betur næst? (Lessons learned)</Label>
                            <Textarea
                                value={lessonsLearned}
                                onChange={(e) => setLessonsLearned(e.target.value)}
                                placeholder="Hvað má gera betur svo þetta endurtaki sig ekki..."
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Aðrar athugasemdir</Label>
                            <Textarea
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                placeholder="Aðrar athugasemdir um lausnina..."
                                rows={2}
                            />
                        </div>
                        <Button
                            onClick={() => completingId && handleComplete(completingId)}
                            disabled={isPending || !correctiveAction.trim()}
                            className="w-full"
                        >
                            {isPending ? 'Vista...' : 'Merkja sem lokið'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="rounded-lg border border-zinc-200 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-50">
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase w-8"></TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase">Vandamál</TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase">Flokkur</TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase">Forgangur</TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase">Staða</TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase">Tilkynnt af</TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase">Dagsetning</TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase">Aðgerðir</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-zinc-500 py-8">
                                    Engar lagfæringar skráðar
                                </TableCell>
                            </TableRow>
                        ) : (
                            requests.map((request) => {
                                const safeStatus = (request.status && request.status in statusColors ? request.status : 'pending') as string
                                const safePriority = (request.priority && request.priority in priorityColors ? request.priority : 'normal') as string
                                const safeCategory = (request.category && request.category in categoryLabels ? request.category : 'other') as string
                                const isExpanded = expandedId === request.id
                                const defectPhotos = (Array.isArray(request.photos) ? request.photos : []) as Array<{ url: string; name: string; uploaded_at: string }>
                                const hasDetails = !!(request.root_cause || request.corrective_action || request.lessons_learned || request.resolution_notes || defectPhotos.length > 0 || safeStatus !== 'completed')

                                return (
                                    <>
                                        <TableRow
                                            key={request.id}
                                            className={`${request.delivery_impact && safeStatus !== 'completed' ? 'bg-red-50/30' : ''} ${hasDetails ? 'cursor-pointer' : ''}`}
                                            onClick={() => hasDetails && setExpandedId(isExpanded ? null : request.id)}
                                        >
                                            <TableCell className="w-8 px-2">
                                                {hasDetails && (
                                                    isExpanded
                                                        ? <ChevronUp className="h-4 w-4 text-zinc-400" />
                                                        : <ChevronDown className="h-4 w-4 text-zinc-400" />
                                                )}
                                            </TableCell>
                                            <TableCell className="max-w-[250px]">
                                                <div className="truncate text-sm font-medium text-zinc-900">{request.issue_description}</div>
                                                {request.element && (
                                                    <div className="text-xs text-zinc-500 mt-0.5">
                                                        Eining: {request.element.name}
                                                    </div>
                                                )}
                                                {request.delivery_impact && safeStatus !== 'completed' && (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <AlertTriangle className="w-3 h-3 text-red-600" />
                                                        <span className="text-xs font-medium text-red-700">Hefur áhrif á afhendingu</span>
                                                    </div>
                                                )}
                                                {defectPhotos.length > 0 && (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <Camera className="w-3 h-3 text-zinc-400" />
                                                        <span className="text-xs text-zinc-500">{defectPhotos.length} mynd{defectPhotos.length > 1 ? 'ir' : ''}</span>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs">
                                                    {categoryLabels[safeCategory] || safeCategory}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={priorityColors[safePriority] || priorityColors.normal}>
                                                    {priorityLabels[safePriority] || safePriority}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={statusColors[safeStatus] || statusColors.pending}>
                                                    {statusLabels[safeStatus] || safeStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-zinc-600">
                                                {request.reporter?.full_name || '-'}
                                            </TableCell>
                                            <TableCell className="text-sm text-zinc-500">
                                                {request.created_at ? new Date(request.created_at).toLocaleDateString('is-IS') : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {safeStatus === 'pending' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e) => { e.stopPropagation(); handleStatusChange(request.id, 'in_progress') }}
                                                        disabled={isPending}
                                                    >
                                                        Hefja
                                                    </Button>
                                                )}
                                                {safeStatus === 'in_progress' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e) => { e.stopPropagation(); handleStatusChange(request.id, 'completed') }}
                                                        disabled={isPending}
                                                    >
                                                        Ljúka
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                        {/* Expanded detail row */}
                                        {isExpanded && hasDetails && (
                                            <TableRow key={`${request.id}-detail`} className="bg-zinc-50/80">
                                                <TableCell colSpan={8} className="px-6 py-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                        {request.root_cause && (
                                                            <div>
                                                                <p className="font-medium text-zinc-700 mb-1">Grunnorsök</p>
                                                                <p className="text-zinc-600 whitespace-pre-wrap">{request.root_cause}</p>
                                                            </div>
                                                        )}
                                                        {request.corrective_action && (
                                                            <div>
                                                                <p className="font-medium text-zinc-700 mb-1">Lagfæring</p>
                                                                <p className="text-zinc-600 whitespace-pre-wrap">{request.corrective_action}</p>
                                                            </div>
                                                        )}
                                                        {request.lessons_learned && (
                                                            <div>
                                                                <p className="font-medium text-zinc-700 mb-1">Lærdómur</p>
                                                                <p className="text-zinc-600 whitespace-pre-wrap">{request.lessons_learned}</p>
                                                            </div>
                                                        )}
                                                        {request.resolution_notes && (
                                                            <div>
                                                                <p className="font-medium text-zinc-700 mb-1">Athugasemdir</p>
                                                                <p className="text-zinc-600 whitespace-pre-wrap">{request.resolution_notes}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Defect photos */}
                                                    <div className="mt-3 pt-3 border-t border-zinc-200">
                                                        <DefectPhotoUpload
                                                            requestId={request.id}
                                                            photos={defectPhotos}
                                                            disabled={safeStatus === 'completed' || safeStatus === 'cancelled'}
                                                        />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

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
import { AlertTriangle } from 'lucide-react'
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

export function FixInFactoryList({ requests }: FixInFactoryListProps) {
    const [isPending, startTransition] = useTransition()
    const [isCreating, setIsCreating] = useState(false)
    const [issueDescription, setIssueDescription] = useState('')
    const [priority, setPriority] = useState<FixPriority>('normal')
    const [category, setCategory] = useState<FixCategory>('other')
    const [deliveryImpact, setDeliveryImpact] = useState(false)
    const [resolutionNotes, setResolutionNotes] = useState('')
    const [completingId, setCompletingId] = useState<string | null>(null)

    const handleCreate = async () => {
        if (!issueDescription.trim()) return

        startTransition(async () => {
            const result = await createFixRequest({
                issue_description: issueDescription,
                priority,
                category,
                delivery_impact: deliveryImpact,
            })

            if (result.success) {
                setIsCreating(false)
                setIssueDescription('')
                setPriority('normal')
                setCategory('other')
                setDeliveryImpact(false)
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
            await updateFixStatus(requestId, 'completed', resolutionNotes)
            setCompletingId(null)
            setResolutionNotes('')
        })
    }

    const deliveryBlockers = requests.filter(r => r.delivery_impact && r.status !== 'completed' && r.status !== 'cancelled')

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-zinc-900">Lagfaeringar (Fix Requests)</h2>
                    {deliveryBlockers.length > 0 && (
                        <Badge variant="secondary" className="bg-red-100 text-red-800 gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {deliveryBlockers.length} hefta afhendingu
                        </Badge>
                    )}
                </div>
                <Dialog open={isCreating} onOpenChange={setIsCreating}>
                    <DialogTrigger asChild>
                        <Button>+ Ny lagfaering</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Skra lagfaeringu</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Lysing *</Label>
                                <Textarea
                                    value={issueDescription}
                                    onChange={(e) => setIssueDescription(e.target.value)}
                                    placeholder="Lystu vandamalinu..."
                                    rows={4}
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
                                    Hefur ahrif a afhendingu (Blocks delivery)
                                </Label>
                            </div>
                            <Button
                                onClick={handleCreate}
                                disabled={isPending || !issueDescription.trim()}
                                className="w-full"
                            >
                                {isPending ? 'Vistar...' : 'Skra lagfaeringu'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Completion dialog */}
            <Dialog open={!!completingId} onOpenChange={() => setCompletingId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ljuka lagfaeringu</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Athugasemdir vid lausn</Label>
                            <Textarea
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                placeholder="Hvernig var malid leyst..."
                                rows={4}
                            />
                        </div>
                        <Button
                            onClick={() => completingId && handleComplete(completingId)}
                            disabled={isPending}
                            className="w-full"
                        >
                            {isPending ? 'Vistar...' : 'Merkja sem lokid'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="rounded-lg border border-zinc-200 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-50">
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase">Vandamal</TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase">Flokkur</TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase">Forgangur</TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase">Stada</TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase">Tilkynnt af</TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase">Uthlutad</TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase">Dagsetning</TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase">Adgerdir</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-zinc-500 py-8">
                                    Engar lagfaeringar skradar
                                </TableCell>
                            </TableRow>
                        ) : (
                            requests.map((request) => {
                                const safeStatus = (request.status && request.status in statusColors ? request.status : 'pending') as string
                                const safePriority = (request.priority && request.priority in priorityColors ? request.priority : 'normal') as string
                                const safeCategory = (request.category && request.category in categoryLabels ? request.category : 'other') as string

                                return (
                                    <TableRow key={request.id} className={request.delivery_impact && safeStatus !== 'completed' ? 'bg-red-50/30' : ''}>
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
                                                    <span className="text-xs font-medium text-red-700">Hefur ahrif a afhendingu</span>
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
                                        <TableCell className="text-sm text-zinc-600">
                                            {request.assignee?.full_name || '-'}
                                        </TableCell>
                                        <TableCell className="text-sm text-zinc-500">
                                            {request.created_at ? new Date(request.created_at).toLocaleDateString('is-IS') : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {safeStatus === 'pending' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleStatusChange(request.id, 'in_progress')}
                                                    disabled={isPending}
                                                >
                                                    Hefja
                                                </Button>
                                            )}
                                            {safeStatus === 'in_progress' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleStatusChange(request.id, 'completed')}
                                                    disabled={isPending}
                                                >
                                                    Ljuka
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

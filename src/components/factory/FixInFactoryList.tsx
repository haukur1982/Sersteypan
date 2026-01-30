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
import {
    createFixRequest,
    updateFixStatus,
    FixStatus,
    FixPriority,
    type FixRequestRecord
} from '@/lib/factory/fix-factory-actions'

interface FixInFactoryListProps {
    requests: FixRequestRecord[]
}

const statusColors: Record<FixStatus, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    completed: 'bg-green-500/20 text-green-400 border-green-500/50',
    cancelled: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/50'
}

const priorityColors: Record<FixPriority, string> = {
    low: 'bg-neutral-500/20 text-neutral-400',
    normal: 'bg-blue-500/20 text-blue-400',
    high: 'bg-orange-500/20 text-orange-400',
    urgent: 'bg-red-500/20 text-red-400'
}

export function FixInFactoryList({ requests }: FixInFactoryListProps) {
    const [isPending, startTransition] = useTransition()
    const [isCreating, setIsCreating] = useState(false)
    const [issueDescription, setIssueDescription] = useState('')
    const [priority, setPriority] = useState<FixPriority>('normal')
    const [resolutionNotes, setResolutionNotes] = useState('')
    const [completingId, setCompletingId] = useState<string | null>(null)

    const handleCreate = async () => {
        if (!issueDescription.trim()) return

        startTransition(async () => {
            const result = await createFixRequest({
                issue_description: issueDescription,
                priority
            })

            if (result.success) {
                setIsCreating(false)
                setIssueDescription('')
                setPriority('normal')
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

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Fix Requests</h2>
                <Dialog open={isCreating} onOpenChange={setIsCreating}>
                    <DialogTrigger asChild>
                        <Button className="bg-accent hover:bg-accent/90">
                            + New Fix Request
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Report Issue</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Issue Description *</Label>
                                <Textarea
                                    value={issueDescription}
                                    onChange={(e) => setIssueDescription(e.target.value)}
                                    placeholder="Describe what needs to be fixed..."
                                    rows={4}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Priority</Label>
                                <Select value={priority} onValueChange={(v) => setPriority(v as FixPriority)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                onClick={handleCreate}
                                disabled={isPending || !issueDescription.trim()}
                                className="w-full"
                            >
                                {isPending ? 'Creating...' : 'Create Request'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Completion dialog */}
            <Dialog open={!!completingId} onOpenChange={() => setCompletingId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Complete Fix Request</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Resolution Notes</Label>
                            <Textarea
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                placeholder="Describe how the issue was resolved..."
                                rows={4}
                            />
                        </div>
                        <Button
                            onClick={() => completingId && handleComplete(completingId)}
                            disabled={isPending}
                            className="w-full"
                        >
                            {isPending ? 'Completing...' : 'Mark as Completed'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead>Issue</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Reporter</TableHead>
                            <TableHead>Assignee</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                    No fix requests found
                                </TableCell>
                            </TableRow>
                        ) : (
                            requests.map((request) => {
                                const safeStatus = (request.status in statusColors ? request.status : 'pending') as FixStatus
                                const safePriority = (request.priority in priorityColors ? request.priority : 'normal') as FixPriority

                                return (
                                    <TableRow key={request.id}>
                                        <TableCell className="max-w-[300px]">
                                            <div className="truncate">{request.issue_description}</div>
                                            {request.element && (
                                                <div className="text-xs text-muted-foreground">
                                                    Element: {request.element.name}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={priorityColors[safePriority]}>
                                                {safePriority}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={statusColors[safeStatus]}>
                                                {safeStatus.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {request.reporter?.full_name || '-'}
                                        </TableCell>
                                        <TableCell>
                                            {request.assignee?.full_name || '-'}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {request.created_at ? new Date(request.created_at).toLocaleDateString() : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {safeStatus === 'pending' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleStatusChange(request.id, 'in_progress')}
                                                    disabled={isPending}
                                                >
                                                    Start
                                                </Button>
                                            )}
                                            {safeStatus === 'in_progress' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleStatusChange(request.id, 'completed')}
                                                    disabled={isPending}
                                                >
                                                    Complete
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

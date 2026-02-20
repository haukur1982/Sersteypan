'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface Project {
    id: string
    name: string
}

interface ProjectSelectDropdownProps {
    projects: Project[]
    currentProjectId?: string
}

export function ProjectSelectDropdown({ projects, currentProjectId }: ProjectSelectDropdownProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const handleProjectChange = (projectId: string) => {
        const params = new URLSearchParams(searchParams)

        if (projectId === 'all') {
            params.delete('project')
        } else {
            params.set('project', projectId)
        }

        router.push(`${pathname}?${params.toString()}`)
    }

    return (
        <Select
            value={currentProjectId || 'all'}
            onValueChange={handleProjectChange}
        >
            <SelectTrigger className="w-[250px] h-9">
                <SelectValue placeholder="Veldu verkefni..." />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectItem value="all">Öll verkefni</SelectItem>
                    {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                            {project.name}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    )
}

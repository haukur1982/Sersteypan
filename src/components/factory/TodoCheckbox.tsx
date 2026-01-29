'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Checkbox } from '@/components/ui/checkbox'
import { toggleTodoCompletion } from '@/lib/todos/actions'

interface TodoCheckboxProps {
    todoId: string
    isCompleted: boolean
}

export function TodoCheckbox({ todoId, isCompleted }: TodoCheckboxProps) {
    const router = useRouter()
    const [isUpdating, setIsUpdating] = useState(false)

    const handleToggle = async (checked: boolean) => {
        setIsUpdating(true)

        try {
            const result = await toggleTodoCompletion(todoId, checked)

            if (!result.error) {
                router.refresh()
            }
        } catch (err) {
            console.error('Error toggling todo:', err)
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <Checkbox
            checked={isCompleted}
            onCheckedChange={handleToggle}
            disabled={isUpdating}
            className="w-5 h-5"
        />
    )
}

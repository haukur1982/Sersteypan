'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pencil, Loader2 } from 'lucide-react'

type EditableCellProps = {
  value: string | number | null
  field: string
  type: 'text' | 'number' | 'select'
  options?: { value: string; label: string }[]
  disabled?: boolean
  onSave: (field: string, value: string | number | null) => Promise<void>
  className?: string
  displayValue?: string
  placeholder?: string
  mono?: boolean
}

export function EditableCell({
  value,
  field,
  type,
  options,
  disabled,
  onSave,
  className = '',
  displayValue,
  placeholder = '—',
  mono = false,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(value ?? ''))
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = useCallback(async () => {
    setIsEditing(false)
    const trimmed = editValue.trim()

    // Determine new value
    let newValue: string | number | null
    if (trimmed === '') {
      newValue = null
    } else if (type === 'number') {
      const num = Number(trimmed)
      if (isNaN(num)) return // Invalid number, discard
      newValue = num
    } else {
      newValue = trimmed
    }

    // Skip if unchanged
    if (newValue === value || (newValue === null && value === null)) return

    setIsSaving(true)
    try {
      await onSave(field, newValue)
    } finally {
      setIsSaving(false)
    }
  }, [editValue, field, onSave, type, value])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      } else if (e.key === 'Escape') {
        setEditValue(String(value ?? ''))
        setIsEditing(false)
      }
    },
    [handleSave, value]
  )

  if (disabled) {
    return (
      <span className={`text-sm text-zinc-600 ${mono ? 'font-mono' : ''} ${className}`}>
        {displayValue ?? (value != null ? String(value) : placeholder)}
      </span>
    )
  }

  // Select type — always render inline
  if (type === 'select' && options) {
    return (
      <div className="relative group">
        {isSaving && (
          <Loader2 className="absolute -left-4 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-blue-500" />
        )}
        <Select
          value={String(value ?? '')}
          onValueChange={async (val) => {
            setIsSaving(true)
            try {
              await onSave(field, val || null)
            } finally {
              setIsSaving(false)
            }
          }}
        >
          <SelectTrigger className="h-7 min-w-[90px] text-xs border-transparent hover:border-zinc-300 focus:border-blue-400 bg-transparent">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  // Text/Number — click to edit
  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type={type === 'number' ? 'number' : 'text'}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`h-7 text-xs px-1.5 w-full min-w-[60px] ${mono ? 'font-mono' : ''}`}
        step={type === 'number' ? 'any' : undefined}
      />
    )
  }

  return (
    <div
      className={`group relative cursor-pointer rounded px-1 -mx-1 hover:bg-blue-50 transition-colors ${className}`}
      onClick={() => {
        setEditValue(String(value ?? ''))
        setIsEditing(true)
      }}
    >
      {isSaving && (
        <Loader2 className="absolute -left-4 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-blue-500" />
      )}
      <span className={`text-sm text-zinc-600 ${mono ? 'font-mono' : ''}`}>
        {displayValue ?? (value != null ? String(value) : placeholder)}
      </span>
      <Pencil className="inline-block ml-1 h-3 w-3 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

'use client'

import { useActionState } from 'react'
import { updateBuyerProfile } from '@/lib/buyer/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2 } from 'lucide-react'

interface ProfileFormProps {
  initialName: string
  initialPhone: string
}

export function ProfileForm({ initialName, initialPhone }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateBuyerProfile, {
    error: '',
    success: false,
  })

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="full_name" className="text-sm font-medium text-zinc-700">
          Nafn
        </label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={initialName}
          placeholder="Fullt nafn"
          required
          className="mt-1"
        />
      </div>

      <div>
        <label htmlFor="phone" className="text-sm font-medium text-zinc-700">
          Símanúmer
        </label>
        <Input
          id="phone"
          name="phone"
          defaultValue={initialPhone}
          placeholder="1234567"
          className="mt-1"
        />
        <p className="text-xs text-zinc-500 mt-1">7 tölustafir, t.d. 8991234</p>
      </div>

      {state.error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Upplýsingar uppfærðar
        </div>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Vista...
          </>
        ) : (
          'Vista breytingar'
        )}
      </Button>
    </form>
  )
}

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TABLES = [
  'school_assignments',
  'internal_notes',
  'player_notes',
  'player_tasks',
  'player_crm_data',
  'checklist_progress',
] as const

export function RealtimeListener({ playerId }: { playerId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`player-${playerId}`)
    for (const table of TABLES) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `player_id=eq.${playerId}`,
        },
        () => router.refresh()
      )
    }
    channel.subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [playerId, router])

  return null
}

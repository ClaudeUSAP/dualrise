'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  updateAgentPayment,
  updateFamilyVirement,
  updatePlayerStatus,
} from './checklist-actions'

type Props = {
  playerId: string
  initialStatus: string | null
  canViewAgentPayments: boolean
  canEditAgentPayments: boolean
  initialAgentPayment1Amount: number | null
  initialAgentPayment1Paid: boolean
  initialAgentPayment2Amount: number | null
  initialAgentPayment2Paid: boolean
  canViewFamilyVirements: boolean
  canEditFamilyVirements: boolean
  initialVirement1Amount: number | null
  initialVirement1Paid: boolean
  initialVirement2Amount: number | null
  initialVirement2Paid: boolean
}

const EUR_FMT = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0,
})

const STATUS_OPTIONS = [
  { value: 'prospect', label: '🔍 Prospect', color: 'bg-zinc-200 text-zinc-700' },
  { value: 'en_cours', label: '⏳ En cours', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'committed', label: '✅ Committed', color: 'bg-green-100 text-green-800' },
  { value: 'signed', label: '📝 Signed', color: 'bg-blue-100 text-blue-800' },
]

const AGENT_DEFAULT_AMOUNT = 525

export function PlayerCRMSection({
  playerId,
  initialStatus,
  canViewAgentPayments,
  canEditAgentPayments,
  initialAgentPayment1Amount,
  initialAgentPayment1Paid,
  initialAgentPayment2Amount,
  initialAgentPayment2Paid,
  canViewFamilyVirements,
  canEditFamilyVirements,
  initialVirement1Amount,
  initialVirement1Paid,
  initialVirement2Amount,
  initialVirement2Paid,
}: Props) {
  const [pending, startTransition] = useTransition()

  function handleStatus(status: string) {
    startTransition(async () => {
      try {
        await updatePlayerStatus(playerId, status)
      } catch (err) {
        console.error(err)
      }
    })
  }

  const agentAmt1 = initialAgentPayment1Amount ?? AGENT_DEFAULT_AMOUNT
  const agentAmt2 = initialAgentPayment2Amount ?? AGENT_DEFAULT_AMOUNT
  const agentPaidTotal =
    (initialAgentPayment1Paid ? agentAmt1 : 0) +
    (initialAgentPayment2Paid ? agentAmt2 : 0)
  const agentGrandTotal = agentAmt1 + agentAmt2

  const famAmt1 = initialVirement1Amount ?? 0
  const famAmt2 = initialVirement2Amount ?? 0
  const famPaidTotal =
    (initialVirement1Paid ? famAmt1 : 0) +
    (initialVirement2Paid ? famAmt2 : 0)
  const famGrandTotal = famAmt1 + famAmt2

  return (
    <section className="mt-6 space-y-4">
      <div className="rounded-md border border-line bg-white p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted mb-2">Statut</h3>
        <div className="flex flex-wrap gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleStatus(opt.value)}
              disabled={pending}
              className={`rounded px-2 py-1 text-[11px] font-bold transition ${
                initialStatus === opt.value
                  ? opt.color
                  : 'bg-cream-2 text-muted hover:bg-zinc-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {canViewAgentPayments && (
        <div className="rounded-md border border-purple-200 bg-purple-50/40 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-purple-700 mb-3">
            🔒 Paiements agents
          </h3>
          <div className="flex flex-col gap-2">
            <PaymentRow
              kind="agent"
              playerId={playerId}
              which={1}
              label="Versement 1"
              initialAmount={agentAmt1}
              initialPaid={initialAgentPayment1Paid}
              canEdit={canEditAgentPayments}
              placeholder={AGENT_DEFAULT_AMOUNT}
              accent="purple"
            />
            <PaymentRow
              kind="agent"
              playerId={playerId}
              which={2}
              label="Versement 2"
              initialAmount={agentAmt2}
              initialPaid={initialAgentPayment2Paid}
              canEdit={canEditAgentPayments}
              placeholder={AGENT_DEFAULT_AMOUNT}
              accent="purple"
            />
            <div className="mt-2 border-t border-purple-200 pt-2 text-xs text-purple-900">
              Total payé :{' '}
              <strong>{EUR_FMT.format(agentPaidTotal)} €</strong>{' '}
              / {EUR_FMT.format(agentGrandTotal)} €
            </div>
          </div>
        </div>
      )}

      {canViewFamilyVirements && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/40 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-3">
            💰 Virements famille
          </h3>
          <div className="flex flex-col gap-2">
            <PaymentRow
              kind="family"
              playerId={playerId}
              which={1}
              label="Virement 1 (50% signature)"
              initialAmount={famAmt1}
              initialPaid={initialVirement1Paid}
              canEdit={canEditFamilyVirements}
              placeholder={null}
              accent="emerald"
            />
            <PaymentRow
              kind="family"
              playerId={playerId}
              which={2}
              label="Virement 2 (1er déc.)"
              initialAmount={famAmt2}
              initialPaid={initialVirement2Paid}
              canEdit={canEditFamilyVirements}
              placeholder={null}
              accent="emerald"
            />
            <div className="mt-2 border-t border-emerald-200 pt-2 text-xs text-emerald-900">
              Total payé :{' '}
              <strong>{EUR_FMT.format(famPaidTotal)} €</strong>{' '}
              / {EUR_FMT.format(famGrandTotal)} €
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

type Accent = 'purple' | 'emerald'

function PaymentRow({
  kind,
  playerId,
  which,
  label,
  initialAmount,
  initialPaid,
  canEdit,
  placeholder,
  accent,
}: {
  kind: 'agent' | 'family'
  playerId: string
  which: 1 | 2
  label: string
  initialAmount: number
  initialPaid: boolean
  canEdit: boolean
  placeholder: number | null
  accent: Accent
}) {
  const [amount, setAmount] = useState<string>(
    initialAmount > 0 ? String(initialAmount) : ''
  )
  const [paid, setPaid] = useState<boolean>(initialPaid)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setAmount(initialAmount > 0 ? String(initialAmount) : '')
  }, [initialAmount])
  useEffect(() => {
    setPaid(initialPaid)
  }, [initialPaid])

  const baselineStr = initialAmount > 0 ? String(initialAmount) : ''

  function commitAmount() {
    if (amount.trim() === '') {
      if (kind === 'family') {
        if (baselineStr === '') return
        startTransition(async () => {
          try {
            await updateFamilyVirement(playerId, which, { amount: null })
          } catch (err) {
            console.error(err)
            setAmount(baselineStr)
          }
        })
      } else {
        setAmount(baselineStr)
      }
      return
    }
    const parsed = Number.parseFloat(amount.replace(',', '.'))
    if (!Number.isFinite(parsed) || parsed < 0) {
      setAmount(baselineStr)
      return
    }
    if (parsed === initialAmount) return
    startTransition(async () => {
      try {
        if (kind === 'agent') {
          await updateAgentPayment(playerId, which, { amount: parsed })
        } else {
          await updateFamilyVirement(playerId, which, { amount: parsed })
        }
      } catch (err) {
        console.error(err)
        setAmount(baselineStr)
      }
    })
  }

  function togglePaid(next: boolean) {
    setPaid(next)
    startTransition(async () => {
      try {
        if (kind === 'agent') {
          await updateAgentPayment(playerId, which, { paid: next })
        } else {
          await updateFamilyVirement(playerId, which, { paid: next })
        }
      } catch (err) {
        console.error(err)
        setPaid(!next)
      }
    })
  }

  const borderClass = accent === 'purple' ? 'border-purple-200 focus:border-purple-500' : 'border-emerald-200 focus:border-emerald-500'

  if (!canEdit) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-navy">{label} :</span>
        <div className="flex items-center gap-2">
          <span className="tabular-nums font-bold text-navy">
            {EUR_FMT.format(initialAmount)} €
          </span>
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-bold ${
              paid
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {paid ? '✅ Payé' : '⏳ En attente'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="text-navy">{label} :</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          step={1}
          value={amount}
          placeholder={placeholder != null ? String(placeholder) : ''}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={commitAmount}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
          disabled={pending}
          className={`w-24 rounded border bg-white px-2 py-0.5 text-right tabular-nums text-sm text-navy outline-none ${borderClass}`}
        />
        <span className="text-sm text-navy">€</span>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={paid}
            onChange={(e) => togglePaid(e.target.checked)}
            disabled={pending}
            className="h-4 w-4"
          />
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-bold ${
              paid
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {paid ? '✅ Payé' : '⏳ En attente'}
          </span>
        </label>
      </div>
    </div>
  )
}

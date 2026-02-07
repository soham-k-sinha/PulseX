import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ExternalLink, Loader2, X, AlertCircle } from 'lucide-react'
import EscrowFlowViz from './EscrowFlowViz'

const EXPLORER = import.meta.env.VITE_XRPL_EXPLORER_URL || 'https://devnet.xrpl.org'

export type FlowStatus = 'idle' | 'funding' | 'creating' | 'complete' | 'error'

interface Allocation {
  org_id: number
  org_name: string
  amount_xrp?: number
  amount_rlusd?: number
  currency?: string
  percentage?: number
  escrow_tx_hash?: string
  error?: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  status: FlowStatus
  result?: {
    disaster_id: string
    disaster_account: string
    total_allocated_xrp: number
    total_allocated_rlusd?: number
    allocations: Allocation[]
    rlusd_allocations?: Allocation[]
  }
  error?: string
}

const STEP_MAP: Record<FlowStatus, number> = {
  idle: 2,
  funding: 4,
  creating: 5,
  complete: 7,
  error: -1,
}

const STATUS_CONFIG: Record<FlowStatus, { label: string; sub: string; color: string }> = {
  idle: {
    label: 'Initializing Emergency Protocol',
    sub: 'Reading balances and calculating allocations...',
    color: 'text-zinc-400',
  },
  funding: {
    label: 'Funding Disaster Wallet',
    sub: 'Transferring funds to dedicated disaster response wallet...',
    color: 'text-amber-400',
  },
  creating: {
    label: 'Creating Escrow Locks',
    sub: 'Locking funds in XRPL TokenEscrow for each organization...',
    color: 'text-blue-400',
  },
  complete: {
    label: 'Allocation Complete',
    sub: 'All funds locked in escrow. Organizations will receive funds automatically.',
    color: 'text-emerald-400',
  },
  error: {
    label: 'Allocation Failed',
    sub: 'An error occurred during the emergency allocation.',
    color: 'text-red-400',
  },
}

export default function EmergencyFlowModal({ isOpen, onClose, status, result, error }: Props) {
  const cfg = STATUS_CONFIG[status]
  const step = STEP_MAP[status]
  const isLoading = status === 'idle' || status === 'funding' || status === 'creating'

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
            onClick={status === 'complete' || status === 'error' ? onClose : undefined}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-5xl bg-[#060606] border border-white/[0.08] rounded-[40px] overflow-hidden shadow-2xl"
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-10 pt-8 pb-2">
              <div className="flex items-center gap-3">
                {isLoading && (
                  <Loader2 size={14} className="text-white/40 animate-spin" />
                )}
                {status === 'complete' && (
                  <CheckCircle2 size={14} className="text-emerald-500" />
                )}
                {status === 'error' && (
                  <AlertCircle size={14} className="text-red-500" />
                )}
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.25em]">
                  Emergency Allocation Protocol
                </span>
              </div>
              {(status === 'complete' || status === 'error') && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-full text-zinc-600 hover:text-white transition-colors border border-white/[0.04] hover:border-white/[0.1]"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status message */}
            <div className="px-10 pt-4 pb-2">
              <motion.h2
                key={status}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`text-xl font-semibold mb-1 ${cfg.color}`}
              >
                {cfg.label}
              </motion.h2>
              <motion.p
                key={`sub-${status}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-sm text-zinc-600"
              >
                {cfg.sub}
              </motion.p>
            </div>

            {/* Flow visualization */}
            <div className="px-6 py-6">
              <EscrowFlowViz activeStep={step} animated={true} />
            </div>

            {/* Progress bar */}
            <div className="mx-10 mb-6">
              <div className="h-[2px] bg-white/[0.04] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: status === 'error'
                      ? '#EF4444'
                      : 'linear-gradient(90deg, #818CF8, #34D399, #F87171)',
                  }}
                  initial={{ width: '0%' }}
                  animate={{
                    width: status === 'idle' ? '20%'
                      : status === 'funding' ? '50%'
                      : status === 'creating' ? '80%'
                      : status === 'complete' ? '100%'
                      : '100%',
                  }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Results */}
            <AnimatePresence>
              {status === 'complete' && result && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.5 }}
                  className="px-10 pb-10"
                >
                  {/* Summary */}
                  {(() => {
                    const hasXrp = result.total_allocated_xrp > 0
                    const hasRlusd = (result.total_allocated_rlusd || 0) > 0
                    const xrpOrgCount = result.allocations.filter(a => !a.error).length
                    const rlusdOrgCount = (result.rlusd_allocations || []).filter(a => !a.error).length
                    const totalOrgCount = Math.max(xrpOrgCount, rlusdOrgCount)
                    const allAllocations: Allocation[] = [
                      ...result.allocations.map(a => ({ ...a, currency: 'XRP' })),
                      ...(result.rlusd_allocations || []).map(a => ({ ...a, currency: 'RLUSD' })),
                    ]

                    return (
                      <>
                        <div className="flex items-center gap-6 mb-6 p-5 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/[0.1] flex-wrap">
                          {hasXrp && (
                            <div>
                              <div className="text-[9px] font-bold text-emerald-600/80 uppercase tracking-[0.2em] mb-1">XRP Allocated</div>
                              <div className="text-2xl font-light text-emerald-400">{result.total_allocated_xrp.toFixed(2)} XRP</div>
                            </div>
                          )}
                          {hasXrp && hasRlusd && <div className="w-px h-10 bg-white/[0.05]" />}
                          {hasRlusd && (
                            <div>
                              <div className="text-[9px] font-bold text-emerald-600/80 uppercase tracking-[0.2em] mb-1">RLUSD Allocated</div>
                              <div className="text-2xl font-light text-emerald-400">{(result.total_allocated_rlusd || 0).toFixed(2)} RLUSD</div>
                            </div>
                          )}
                          <div className="w-px h-10 bg-white/[0.05]" />
                          <div>
                            <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-1">Disaster ID</div>
                            <div className="text-sm text-white/60 font-mono">{result.disaster_id}</div>
                          </div>
                          <div className="w-px h-10 bg-white/[0.05]" />
                          <div>
                            <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-1">Organizations</div>
                            <div className="text-sm text-white/60">{totalOrgCount} funded</div>
                          </div>
                        </div>

                        {/* Allocation breakdown */}
                        <div className="space-y-2">
                          {allAllocations.map((alloc, idx) => {
                            const isRlusd = alloc.currency === 'RLUSD'
                            const displayAmount = isRlusd ? alloc.amount_rlusd : alloc.amount_xrp
                            const displayCurrency = isRlusd ? 'RLUSD' : 'XRP'
                            return (
                              <motion.div
                                key={`${alloc.currency}-${idx}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * idx }}
                                className={`flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border group hover:border-white/[0.08] transition-all ${
                                  isRlusd ? 'border-emerald-500/10' : 'border-white/[0.04]'
                                }`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${alloc.error ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                    {alloc.error ? '!' : '\u2713'}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-white">{alloc.org_name}</span>
                                      <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                                        isRlusd ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/[0.05] text-zinc-400 border border-white/10'
                                      }`}>{displayCurrency}</span>
                                    </div>
                                    {alloc.escrow_tx_hash && (
                                      <a
                                        href={`${EXPLORER}/transactions/${alloc.escrow_tx_hash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-emerald-400 transition-colors mt-0.5"
                                      >
                                        <ExternalLink size={8} />
                                        {alloc.escrow_tx_hash.slice(0, 16)}...
                                      </a>
                                    )}
                                    {alloc.error && (
                                      <span className="text-[10px] text-red-400/80">{alloc.error}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  {displayAmount != null && (
                                    <div className="text-base font-semibold text-white">{displayAmount.toFixed(3)} {displayCurrency}</div>
                                  )}
                                  {alloc.percentage != null && (
                                    <div className="text-[10px] text-zinc-600">{alloc.percentage.toFixed(1)}%</div>
                                  )}
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      </>
                    )
                  })()}

                  {/* Close button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="w-full mt-6 py-3.5 bg-white/[0.04] border border-white/[0.08] text-sm font-bold text-zinc-400 uppercase tracking-[0.15em] rounded-2xl hover:bg-white/[0.06] hover:text-white transition-all"
                  >
                    Close
                  </motion.button>
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-10 pb-10"
                >
                  <div className="p-5 rounded-2xl bg-red-500/[0.04] border border-red-500/[0.1]">
                    <p className="text-sm text-red-400">{error || 'Unknown error occurred'}</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="w-full mt-4 py-3.5 bg-white/[0.04] border border-white/[0.08] text-sm font-bold text-zinc-400 uppercase tracking-[0.15em] rounded-2xl hover:bg-white/[0.06] hover:text-white transition-all"
                  >
                    Close
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet, TrendingUp, ExternalLink, Zap, ShieldCheck, Activity, Database,
  CheckCircle2, AlertCircle, Loader2, Heart, Building, MapPin
} from 'lucide-react'
import { WalletInfo } from '../services/wallet'
import { signTransaction } from '../services/wallet'
import * as api from '../services/api'

const EXPLORER = import.meta.env.VITE_XRPL_EXPLORER_URL || 'https://devnet.xrpl.org'

interface Props {
  wallet: WalletInfo
}

interface TrackedDonation {
  donation_id: string
  amount_xrp: number
  payment_tx_hash: string
  created_at: string
  status: string
  batch_id: string | null
  lifecycle: {
    received: boolean
    batched: boolean
    released_to_reserve: boolean
    allocated_to_disaster: boolean
    sent_to_orgs: boolean
    released_to_orgs: boolean
  }
  batch_info: any | null
  disaster_allocations: Array<{
    disaster_id: string
    disaster_type: string
    location: string
    severity: number
    total_allocated_xrp: number
    your_share_xrp: number
    your_share_pct: number
    status: string
    created_at: string
    organizations: Array<{
      org_name: string
      cause_type: string
      total_amount_xrp: number
      your_share_xrp: number
      escrow_tx_hash: string
      finish_tx_hash: string | null
      status: string
      created_at: string
      finished_at: string | null
    }>
  }>
}

export default function DonorDashboard({ wallet }: Props) {
  const [amount, setAmount] = useState('')
  const [donating, setDonating] = useState(false)
  const [trackedDonations, setTrackedDonations] = useState<TrackedDonation[]>([])
  const [totalDonated, setTotalDonated] = useState(0)
  const [poolBalance, setPoolBalance] = useState(0)
  const [threshold, setThreshold] = useState(50)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [selectedDonation, setSelectedDonation] = useState<TrackedDonation | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [tracking, xrpl] = await Promise.all([
        api.trackDonations(wallet.address),
        api.getXRPLStatus(),
      ])

      setTrackedDonations(tracking.donations || [])
      setTotalDonated(tracking.donations.reduce((sum: number, d: TrackedDonation) => sum + d.amount_xrp, 0))
      // Show RESERVE balance (the actual emergency fund) instead of pool
      setPoolBalance(xrpl.accounts?.reserve?.balance_xrp || 0)

      // Try to get threshold from a donor status call
      const status = await api.getDonorStatus(wallet.address)
      if (status.pool_status?.threshold_xrp) {
        setThreshold(status.pool_status.threshold_xrp)
      }
    } catch {
      // silent
    }
  }, [wallet.address])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [loadData])

  const handleDonate = async () => {
    const xrp = parseFloat(amount)
    if (!xrp || xrp <= 0) {
      setError('Enter a valid amount')
      return
    }

    setDonating(true)
    setError('')
    setMessage('')

    try {
      const prepared = await api.prepareDonation(wallet.address, xrp)
      const txBlob = await signTransaction(prepared.unsigned_tx)
      const result = await api.submitSignedTx(txBlob, wallet.address)

      setMessage(`Donation confirmed! ${xrp} XRP sent to pool.`)
      setAmount('')

      // Immediately refresh data
      loadData()

      // Force another refresh after 2 seconds to catch XRPL ledger validation
      setTimeout(() => {
        loadData()
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDonating(false)
    }
  }

  const getStatusBadge = (donation: TrackedDonation) => {
    const lifecycle = donation.lifecycle

    if (lifecycle.released_to_orgs) {
      return { label: 'Released to Organizations', color: 'text-emerald-400', icon: CheckCircle2 }
    }
    if (lifecycle.sent_to_orgs) {
      return { label: 'Locked for Organizations', color: 'text-blue-400', icon: Loader2 }
    }
    if (lifecycle.allocated_to_disaster) {
      return { label: 'Allocated to Disaster', color: 'text-purple-400', icon: Heart }
    }
    if (lifecycle.released_to_reserve) {
      return { label: 'In Reserve', color: 'text-green-400', icon: ShieldCheck }
    }
    if (lifecycle.batched) {
      return { label: 'Batched in Escrow', color: 'text-yellow-400', icon: Loader2 }
    }
    return { label: 'Pending Batch', color: 'text-gray-400', icon: AlertCircle }
  }

  const getLifecycleStep = (lifecycle: TrackedDonation['lifecycle']): number => {
    if (lifecycle.released_to_orgs) return 5
    if (lifecycle.sent_to_orgs) return 4
    if (lifecycle.allocated_to_disaster) return 3
    if (lifecycle.released_to_reserve) return 2
    if (lifecycle.batched) return 1
    return 0
  }

  const LIFECYCLE_STEPS = [
    { label: 'Pool', color: '#818CF8' },
    { label: 'Escrow', color: '#FBBF24' },
    { label: 'Reserve', color: '#34D399' },
    { label: 'Disaster', color: '#F87171' },
    { label: 'Locked', color: '#C084FC' },
    { label: 'Released', color: '#10B981' },
  ]

  // Remove progress bar since we're showing reserve, not pool batch progress

  return (
    <div className="flex min-h-[calc(100vh-72px)]">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 md:p-16">
        {/* Hero - Pool Balance */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-20 text-center py-12"
        >
          <div className="inline-block px-10 py-8 rounded-[48px] border border-emerald-500/10 bg-gradient-to-b from-emerald-500/[0.02] to-transparent">
            <div className="text-xs font-bold text-emerald-600/80 uppercase tracking-[0.3em] mb-4">
              Emergency Reserve Fund
            </div>
            <div className="flex items-center justify-center gap-3">
              <motion.span
                key={poolBalance}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                className="text-7xl md:text-8xl font-extralight text-emerald-400 tracking-ultra-tight"
              >
                {poolBalance.toFixed(2)}
              </motion.span>
              <span className="text-2xl font-light text-zinc-700 italic">XRP</span>
            </div>
            <p className="text-xs text-zinc-600 mt-4 italic">
              Ready to deploy for disaster relief
            </p>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
          </div>

          {/* Stats Row */}
          <div className="flex justify-center gap-16 mt-12">
            {[
              { label: 'Your Total', val: `${totalDonated.toFixed(1)} XRP`, icon: <TrendingUp size={14} /> },
              { label: 'Donations', val: String(trackedDonations.length), icon: <Activity size={14} /> },
              { label: 'Protocol', val: 'Escrow', icon: <ShieldCheck size={14} /> },
            ].map((stat, i) => (
              <div key={i} className="text-left group cursor-default">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-zinc-700 group-hover:text-white transition-colors">{stat.icon}</span>
                  <div className="text-xs font-bold text-zinc-600 uppercase tracking-widest">{stat.label}</div>
                </div>
                <div className="text-xl font-light text-white tracking-tight">{stat.val}</div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Donation History */}
        <div className="max-w-4xl mx-auto mb-32">
          <div className="flex items-center justify-between mb-8 border-b border-white/[0.03] pb-6">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-[0.3em] mb-1">Transaction Ledger</h2>
              <p className="text-sm text-zinc-600 font-medium italic">Track your contributions from pool to impact</p>
            </div>
            <div className="flex items-center gap-3">
              <Database size={14} className="text-zinc-700" />
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                Total: {totalDonated.toFixed(2)} XRP
              </span>
            </div>
          </div>

          {trackedDonations.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto rounded-[20px] border border-white/[0.05] bg-white/[0.01] flex items-center justify-center mb-6">
                <Zap size={24} className="text-zinc-700" />
              </div>
              <p className="text-sm font-bold text-zinc-700 uppercase tracking-[0.2em]">No donations yet</p>
              <p className="text-xs text-zinc-800 mt-2 italic">Use the panel to make your first contribution</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {trackedDonations.map((d, idx) => {
                const statusBadge = getStatusBadge(d)
                const Icon = statusBadge.icon
                const hasDisasters = d.disaster_allocations.length > 0

                return (
                  <motion.div
                    key={d.donation_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-5 rounded-[24px] border border-white/[0.03] bg-white/[0.01] group hover:border-white/[0.08] transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-1">Amount</span>
                          <span className="text-sm font-semibold text-white">{d.amount_xrp} XRP</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-1">Status</span>
                          <div className="flex items-center gap-1.5">
                            <Icon size={12} className={`${statusBadge.color} ${Icon === Loader2 ? 'animate-spin' : ''}`} />
                            <span className={`text-sm font-bold uppercase tracking-widest ${statusBadge.color}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex flex-col text-right">
                          <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-1">Time</span>
                          <span className="text-sm text-zinc-500 font-medium">
                            {new Date(d.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <a
                          href={`${EXPLORER}/transactions/${d.payment_tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 uppercase tracking-widest hover:text-white transition-colors"
                        >
                          <ExternalLink size={12} />
                          View
                        </a>
                      </div>
                    </div>

                    {/* Lifecycle Step Tracker */}
                    <div className="mt-4 pt-4 border-t border-white/[0.04]">
                      <div className="flex items-center gap-0">
                        {LIFECYCLE_STEPS.map((step, si) => {
                          const currentStep = getLifecycleStep(d.lifecycle)
                          const done = si <= currentStep
                          const active = si === currentStep
                          return (
                            <div key={si} className="flex items-center flex-1">
                              <div className="flex flex-col items-center flex-1">
                                <div
                                  className={`w-3 h-3 rounded-full border-2 transition-all duration-500 ${
                                    done
                                      ? active
                                        ? 'scale-125 shadow-[0_0_8px_currentColor]'
                                        : ''
                                      : 'opacity-20'
                                  }`}
                                  style={{
                                    borderColor: step.color,
                                    backgroundColor: done ? step.color : 'transparent',
                                  }}
                                />
                                <span
                                  className="text-[7px] font-bold uppercase tracking-[0.1em] mt-1.5 transition-opacity"
                                  style={{ color: done ? step.color : 'rgba(255,255,255,0.1)' }}
                                >
                                  {step.label}
                                </span>
                              </div>
                              {si < LIFECYCLE_STEPS.length - 1 && (
                                <div
                                  className="h-[1.5px] flex-1 -mt-3 mx-0.5 rounded-full transition-all duration-500"
                                  style={{
                                    backgroundColor: si < currentStep ? step.color : 'rgba(255,255,255,0.04)',
                                  }}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Disaster Allocations */}
                    {hasDisasters && (
                      <div className="pt-4 mt-4 border-t border-white/[0.05]">
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Heart size={12} className="text-pink-500/60" />
                            <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
                              Your Pro-Rata Impact Share
                            </span>
                          </div>
                          <p className="text-sm text-zinc-700 italic ml-5">
                            Your {d.amount_xrp} XRP joined reserve pool with other donors. Below is your proportional share of disasters funded.
                          </p>
                        </div>
                        <div className="space-y-2">
                          {d.disaster_allocations.map((disaster, didx) => (
                            <div key={didx} className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.03]">
                              <div className="mb-2">
                                <div className="flex items-start justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <MapPin size={12} className="text-zinc-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <span className="text-sm font-semibold text-white capitalize">
                                        {disaster.disaster_type} - {disaster.location}
                                      </span>
                                      <span className="text-xs text-zinc-600 ml-2">Severity: {disaster.severity}/10</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-emerald-400">
                                      Your Share: {disaster.your_share_xrp.toFixed(3)} XRP
                                    </div>
                                    <div className="text-xs text-zinc-600">
                                      ({disaster.your_share_pct.toFixed(1)}% of {disaster.total_allocated_xrp.toFixed(2)} XRP)
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {disaster.organizations.length > 0 && (
                                <div className="ml-5 space-y-1.5 mt-2">
                                  {disaster.organizations.map((org, oidx) => (
                                    <div key={oidx} className="flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-2">
                                        <Building size={10} className="text-zinc-700" />
                                        <span className="text-zinc-400 font-medium">{org.org_name}</span>
                                        <span className="text-zinc-700">({org.cause_type})</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="text-right">
                                          <div className="text-white font-bold">{org.your_share_xrp.toFixed(3)} XRP</div>
                                          <div className="text-sm text-zinc-700">of {org.total_amount_xrp.toFixed(2)} total</div>
                                        </div>
                                        {org.status === 'finished' ? (
                                          <CheckCircle2 size={10} className="text-emerald-500" />
                                        ) : (
                                          <Loader2 size={10} className="text-yellow-500 animate-spin" />
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Donate Sidebar */}
      <aside className="w-[400px] h-[calc(100vh-72px)] sticky top-[72px] bg-obsidian border-l border-white/[0.03] p-10 flex-col gap-10 hidden lg:flex">
        <div className="space-y-1">
          <h2 className="text-xs font-bold text-white uppercase tracking-[0.3em]">Donate</h2>
          <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
            XRPL Escrow Protocol // Pool Settlement
          </p>
        </div>

        <div className="flex-1 space-y-10">
          {/* Amount Input */}
          <div className="space-y-4">
            <div className="relative group p-6 rounded-[28px] border border-white/[0.05] bg-white/[0.01] transition-all focus-within:border-white/20">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                step="1"
                className="relative w-full bg-transparent border-none py-2 text-6xl font-extralight text-white outline-none transition-all placeholder:text-zinc-900 tracking-tighter"
              />
              <div className="absolute right-6 bottom-6 text-sm font-bold text-zinc-600 uppercase tracking-widest">
                XRP
              </div>
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {[10, 25, 50, 100].map((val) => (
              <motion.button
                key={val}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setAmount(String(val))}
                className={`py-3.5 rounded-2xl text-sm font-bold uppercase tracking-widest border transition-all duration-300 ${
                  amount === String(val)
                    ? 'bg-white text-black border-white shadow-xl'
                    : 'border-white/[0.08] bg-white/[0.01] text-zinc-500 hover:border-white/20 hover:text-white'
                }`}
              >
                {val} XRP
              </motion.button>
            ))}
          </div>

          {/* Wallet Info */}
          <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/[0.03] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center">
                <Wallet size={14} className="text-zinc-500" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-0.5">Wallet</div>
                <div className="text-sm font-medium text-white/70 font-mono tracking-tighter">
                  {wallet.address.slice(0, 10)}...
                </div>
              </div>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
          </div>

          {/* Donate Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDonate}
            disabled={donating}
            className="relative overflow-hidden w-full py-4 bg-white text-black font-bold text-[15px] uppercase tracking-[0.2em] rounded-[28px] transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] disabled:opacity-50"
          >
            {donating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Signing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Zap size={14} />
                Donate
              </span>
            )}
            <div className="absolute inset-0 shimmer opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
          </motion.button>

          {/* Messages */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="p-4 rounded-2xl bg-emerald-500/[0.05] border border-emerald-500/10"
              >
                <p className="text-sm font-bold text-emerald-400 uppercase tracking-widest">{message}</p>
              </motion.div>
            )}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="p-4 rounded-2xl bg-red-500/[0.05] border border-red-500/10"
              >
                <p className="text-sm font-bold text-red-400 uppercase tracking-widest">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Network Info */}
        <div className="p-4 rounded-[20px] bg-zinc-900/30 border border-white/[0.03] flex items-start gap-3">
          <Activity size={12} className="text-zinc-700 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-1">Protocol</div>
            <p className="text-xs text-zinc-600 leading-relaxed font-medium">
              Donations batch at {threshold} XRP threshold, then lock in XRPL escrow for secure distribution.
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}

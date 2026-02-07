import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet, TrendingUp, Clock, ExternalLink, Zap,
  ArrowRight, ShieldCheck, Activity, Database
} from 'lucide-react'
import { WalletInfo } from '../services/wallet'
import { signTransaction } from '../services/wallet'
import * as api from '../services/api'
import type { Donation, XRPLStatus } from '../types'

const EXPLORER = import.meta.env.VITE_XRPL_EXPLORER_URL || 'https://devnet.xrpl.org'

interface Props {
  wallet: WalletInfo
}

export default function DonorDashboard({ wallet }: Props) {
  const [amount, setAmount] = useState('')
  const [donating, setDonating] = useState(false)
  const [donations, setDonations] = useState<Donation[]>([])
  const [totalDonated, setTotalDonated] = useState(0)
  const [poolBalance, setPoolBalance] = useState(0)
  const [threshold, setThreshold] = useState(50)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [status, xrpl] = await Promise.all([
        api.getDonorStatus(wallet.address),
        api.getXRPLStatus(),
      ])
      setDonations(status.donations || [])
      setTotalDonated(status.total_donated_xrp || 0)
      setPoolBalance(xrpl.accounts?.pool?.balance_xrp || 0)
      // Get threshold from backend response
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
      setPoolBalance(result.pool_status?.current_balance_xrp || poolBalance)
      loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDonating(false)
    }
  }

  const statusColor = (status: string) => {
    if (status === 'pending') return 'text-yellow-400'
    if (status === 'locked_in_escrow') return 'text-blue-400'
    return 'text-zinc-500'
  }

  const statusLabel = (status: string) => {
    if (status === 'pending') return 'Pending Batch'
    if (status === 'locked_in_escrow') return 'Locked in Escrow'
    return status
  }

  const progressPct = Math.min((poolBalance / threshold) * 100, 100)

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
          <div className="inline-block px-10 py-8 rounded-[48px] border border-white/[0.05] bg-gradient-to-b from-white/[0.02] to-transparent">
            <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-4">
              Pool Balance
            </div>
            <div className="flex items-center justify-center gap-3">
              <motion.span
                key={poolBalance}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                className="text-7xl md:text-8xl font-extralight text-white tracking-ultra-tight"
              >
                {poolBalance.toFixed(2)}
              </motion.span>
              <span className="text-2xl font-light text-zinc-700 italic">XRP</span>
            </div>
            <div className="mt-6 max-w-xs mx-auto">
              <div className="h-[2px] bg-white/[0.05] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-white/20 to-white/40 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">
                  {Math.max(threshold - poolBalance, 0).toFixed(1)} XRP to batch
                </span>
                <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">
                  {threshold} XRP
                </span>
              </div>
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>

          {/* Stats Row */}
          <div className="flex justify-center gap-16 mt-12">
            {[
              { label: 'Your Total', val: `${totalDonated.toFixed(1)} XRP`, icon: <TrendingUp size={14} /> },
              { label: 'Donations', val: String(donations.length), icon: <Activity size={14} /> },
              { label: 'Protocol', val: 'Escrow', icon: <ShieldCheck size={14} /> },
            ].map((stat, i) => (
              <div key={i} className="text-left group cursor-default">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-zinc-700 group-hover:text-white transition-colors">{stat.icon}</span>
                  <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{stat.label}</div>
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
              <p className="text-[10px] text-zinc-600 font-medium italic">Your contribution history on-chain</p>
            </div>
            <div className="flex items-center gap-3">
              <Database size={14} className="text-zinc-700" />
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                Total: {totalDonated.toFixed(2)} XRP
              </span>
            </div>
          </div>

          {donations.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto rounded-[20px] border border-white/[0.05] bg-white/[0.01] flex items-center justify-center mb-6">
                <Zap size={24} className="text-zinc-700" />
              </div>
              <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-[0.2em]">No donations yet</p>
              <p className="text-[9px] text-zinc-800 mt-2 italic">Use the panel to make your first contribution</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {donations.map((d, idx) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-5 rounded-[24px] border border-white/[0.03] bg-white/[0.01] flex items-center justify-between group hover:border-white/[0.08] transition-all duration-300"
                >
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Amount</span>
                      <span className="text-sm font-semibold text-white">{d.amount_xrp} XRP</span>
                    </div>
                    <div className="hidden md:flex flex-col">
                      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Status</span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${statusColor(d.batch_status)}`}>
                        {statusLabel(d.batch_status)}
                      </span>
                    </div>
                    {d.batch_id && (
                      <div className="hidden lg:flex flex-col">
                        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Batch</span>
                        <span className="text-[10px] text-zinc-400 font-mono tracking-tighter">{d.batch_id}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden sm:flex flex-col text-right">
                      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Time</span>
                      <span className="text-[10px] text-zinc-500 font-medium">
                        {d.created_at ? new Date(d.created_at).toLocaleTimeString() : ''}
                      </span>
                    </div>
                    <a
                      href={`${EXPLORER}/transactions/${d.payment_tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-600 uppercase tracking-widest hover:text-white transition-colors"
                    >
                      <ExternalLink size={12} />
                      View
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Donate Sidebar */}
      <aside className="w-[400px] h-[calc(100vh-72px)] sticky top-[72px] bg-obsidian border-l border-white/[0.03] p-10 flex-col gap-10 hidden lg:flex">
        <div className="space-y-1">
          <h2 className="text-xs font-bold text-white uppercase tracking-[0.3em]">Donate</h2>
          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
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
              <div className="absolute right-6 bottom-6 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
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
                className={`py-3.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest border transition-all duration-300 ${
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
                <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-0.5">Wallet</div>
                <div className="text-[10px] font-medium text-white/70 font-mono tracking-tighter">
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
            className="relative overflow-hidden w-full py-4 bg-white text-black font-bold text-[11px] uppercase tracking-[0.2em] rounded-[28px] transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] disabled:opacity-50"
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
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{message}</p>
              </motion.div>
            )}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="p-4 rounded-2xl bg-red-500/[0.05] border border-red-500/10"
              >
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Network Info */}
        <div className="p-4 rounded-[20px] bg-zinc-900/30 border border-white/[0.03] flex items-start gap-3">
          <Activity size={12} className="text-zinc-700 mt-0.5" />
          <div>
            <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Protocol</div>
            <p className="text-[9px] text-zinc-600 leading-relaxed font-medium">
              Donations batch at {threshold} XRP threshold, then lock in XRPL escrow for secure distribution.
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}

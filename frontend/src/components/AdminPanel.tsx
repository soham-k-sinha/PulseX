import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldAlert, Building2, ArrowRight, Database,
  Terminal, Activity, MapPin, AlertCircle, Zap, ExternalLink, ChevronDown, ChevronUp
} from 'lucide-react'
import * as api from '../services/api'
import type { DisasterInfo, XRPLStatus, Organization } from '../types'
import EmergencyFlowModal, { FlowStatus } from './EmergencyFlowModal'

const EXPLORER = import.meta.env.VITE_XRPL_EXPLORER_URL || 'https://devnet.xrpl.org'

interface DisasterDetail extends DisasterInfo {
  org_escrows?: Array<{
    org_id: number
    org_name: string
    amount_xrp: number
    status: string
    escrow_tx_hash: string
    finish_tx_hash: string | null
  }>
}

function DisasterAllocationCard({ disaster, index }: { disaster: DisasterInfo; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState<DisasterDetail | null>(null)
  const [loading, setLoading] = useState(false)

  const loadDetail = async () => {
    if (detail) {
      setExpanded(!expanded)
      return
    }
    setLoading(true)
    try {
      const data = await api.getDisaster(disaster.disaster_id)
      setDetail(data)
      setExpanded(true)
    } catch (err) {
      console.error('Failed to load disaster detail:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-6 rounded-[32px] border border-white/[0.05] bg-white/[0.01] hover:border-white/[0.08] transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <MapPin size={14} className="text-zinc-600" />
            <h4 className="text-base font-semibold text-white capitalize">
              {disaster.disaster_type} - {disaster.location}
            </h4>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-zinc-600 uppercase tracking-widest">
            <span>Severity: {disaster.severity}/10</span>
            <span>•</span>
            <span>{disaster.org_count} Organizations</span>
            <span>•</span>
            <span className={disaster.status === 'completed' ? 'text-emerald-500' : 'text-yellow-500'}>
              {disaster.status}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-extralight text-white tracking-tight mb-1">
            {disaster.total_allocated_xrp.toFixed(2)} XRP
          </div>
          <div className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
            From Reserve Pool
          </div>
        </div>
      </div>

      {/* Expand Button */}
      <button
        onClick={loadDetail}
        disabled={loading}
        className="w-full mt-4 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all flex items-center justify-center gap-2 text-sm font-bold text-zinc-500 uppercase tracking-widest group"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin" />
            Loading Details...
          </span>
        ) : (
          <>
            <span className="group-hover:text-white transition-colors">
              {expanded ? 'Hide' : 'View'} Money Flow Breakdown
            </span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </>
        )}
      </button>

      {/* Expanded Detail */}
      <AnimatePresence>
        {expanded && detail && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-6 pt-6 border-t border-white/[0.05] space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <ArrowRight size={14} className="text-emerald-500/60" />
                <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
                  Each XRP Allocation
                </span>
              </div>

              {detail.org_escrows && detail.org_escrows.length > 0 ? (
                <>
                  {/* Summary Bar */}
                  {(() => {
                    const actualTotal = detail.org_escrows.reduce((sum: number, e: any) => sum + e.amount_xrp, 0)
                    const missing = disaster.total_allocated_xrp - actualTotal
                    const hasMissing = missing > 0.01 // More than 0.01 XRP difference

                    return hasMissing ? (
                      <div className="mb-4 p-4 rounded-2xl bg-red-500/[0.05] border border-red-500/10">
                        <div className="flex items-start gap-3">
                          <AlertCircle size={14} className="text-red-500/80 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm font-bold text-red-400 uppercase tracking-widest mb-2">
                              Allocation Mismatch Detected
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-xs">
                              <div>
                                <div className="text-zinc-600 mb-1">Intended Total</div>
                                <div className="text-white font-semibold">{disaster.total_allocated_xrp.toFixed(3)} XRP</div>
                              </div>
                              <div>
                                <div className="text-zinc-600 mb-1">Actually Escrowed</div>
                                <div className="text-emerald-400 font-semibold">{actualTotal.toFixed(3)} XRP</div>
                              </div>
                              <div>
                                <div className="text-zinc-600 mb-1">Failed/Missing</div>
                                <div className="text-red-400 font-semibold">{missing.toFixed(3)} XRP</div>
                              </div>
                            </div>
                            <p className="text-xs text-zinc-600 mt-3 italic">
                              Some organization escrows may have failed during creation. Check logs for details.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null
                  })()}

                  <div className="space-y-2">
                    {detail.org_escrows.map((escrow, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03] flex items-center justify-between group hover:border-white/[0.06] transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-zinc-900 border border-white/5">
                            <Building2 size={14} className="text-zinc-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white mb-0.5">{escrow.org_name}</div>
                            <div className="flex items-center gap-2">
                              <a
                                href={`${EXPLORER}/transactions/${escrow.escrow_tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-zinc-600 hover:text-emerald-400 transition-colors flex items-center gap-1"
                              >
                                <ExternalLink size={10} />
                                Escrow TX
                              </a>
                              {escrow.finish_tx_hash && (
                                <>
                                  <span className="text-zinc-800">•</span>
                                  <a
                                    href={`${EXPLORER}/transactions/${escrow.finish_tx_hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-emerald-500/60 hover:text-emerald-400 transition-colors flex items-center gap-1"
                                  >
                                    <ExternalLink size={10} />
                                    Finish TX
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-white mb-0.5">
                            {escrow.amount_xrp.toFixed(3)} XRP
                          </div>
                          <div
                            className={`text-xs font-bold uppercase tracking-widest ${
                              escrow.status === 'finished' ? 'text-emerald-500' : 'text-yellow-500'
                            }`}
                          >
                            {escrow.status === 'finished' ? '✓ Released' : '⏳ Locked'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-sm text-zinc-700 italic">
                  No organization allocations found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function AdminPanel() {
  const [xrplStatus, setXrplStatus] = useState<XRPLStatus | null>(null)
  const [disasters, setDisasters] = useState<DisasterInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Flow modal state
  const [flowOpen, setFlowOpen] = useState(false)
  const [flowStatus, setFlowStatus] = useState<FlowStatus>('idle')
  const [flowResult, setFlowResult] = useState<any>(null)
  const [flowError, setFlowError] = useState('')

  // Form
  const [disasterType, setDisasterType] = useState('earthquake')
  const [location, setLocation] = useState('')
  const [severity, setSeverity] = useState(7)
  const [causes, setCauses] = useState<string[]>(['health', 'shelter', 'food'])

  const loadData = async () => {
    try {
      const [xrpl, dis] = await Promise.all([
        api.getXRPLStatus(),
        api.getDisasters(),
      ])
      setXrplStatus(xrpl)
      setDisasters(dis.disasters || [])
    } catch {
      // silent
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [])

  const toggleCause = (c: string) => {
    setCauses((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    )
  }

  const handleTrigger = async () => {
    if (!location.trim()) {
      setError('Enter a location')
      return
    }
    if (causes.length === 0) {
      setError('Select at least one cause')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    // Open flow modal with animated progress
    setFlowOpen(true)
    setFlowStatus('idle')
    setFlowResult(null)
    setFlowError('')

    // Simulate progress stages while API call runs
    const timer1 = setTimeout(() => setFlowStatus('funding'), 1500)
    const timer2 = setTimeout(() => setFlowStatus('creating'), 4000)

    try {
      const result = await api.triggerEmergency({
        disaster_type: disasterType,
        location,
        severity,
        affected_causes: causes,
      })

      clearTimeout(timer1)
      clearTimeout(timer2)
      setFlowResult(result)
      setFlowStatus('complete')
      setMessage(
        `Emergency allocated! ${result.total_allocated_xrp} XRP to ${result.allocations?.length || 0} orgs`
      )
      setLocation('')
      loadData()
      setTimeout(() => loadData(), 2000)
    } catch (err: any) {
      clearTimeout(timer1)
      clearTimeout(timer2)
      setFlowError(err.message)
      setFlowStatus('error')
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFlowClose = () => {
    setFlowOpen(false)
    setFlowStatus('idle')
  }

  const poolBalance = xrplStatus?.accounts?.pool?.balance_xrp
  const reserveBalance = xrplStatus?.accounts?.reserve?.balance_xrp

  return (
    <div className="p-8 md:p-16 max-w-7xl mx-auto">
      {/* Hero Section - Trigger + Balances */}
      <section className="mb-20 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* Trigger Button Area */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative"
          >
            <div className="inline-flex items-center gap-3 mb-8 px-4 py-1.5 rounded-full border border-red-500/10 bg-red-500/[0.02]">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-bold uppercase tracking-[0.3em] text-red-500/80">
                Emergency Protocol Access
              </span>
            </div>

            <div className="relative group inline-block">
              <div className="absolute inset-0 bg-red-500/20 blur-[100px] opacity-0 group-hover:opacity-40 transition-opacity rounded-full" />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={loading}
                onClick={handleTrigger}
                className={`
                  relative z-10 w-56 h-56 md:w-64 md:h-64 rounded-full flex flex-col items-center justify-center gap-3 transition-all duration-700
                  border-[12px] border-obsidian shadow-[0_0_50px_rgba(239,68,68,0.2)]
                  ${loading ? 'bg-zinc-900 border-zinc-800 cursor-wait' : 'bg-red-600 hover:bg-red-500 shadow-red-500/40'}
                `}
              >
                <ShieldAlert size={48} className="text-white mb-2" />
                <div className="text-center">
                  <div className="text-xs font-bold text-white uppercase tracking-[0.3em] mb-1">
                    {loading ? 'Allocating...' : 'Trigger'}
                  </div>
                  <div className="text-sm text-white/60 uppercase font-bold tracking-widest">Emergency</div>
                </div>
              </motion.button>
            </div>

            {/* Form Fields Below Trigger */}
            <div className="mt-10 space-y-4 max-w-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-600 uppercase tracking-widest block mb-2">
                    Type
                  </label>
                  <select
                    value={disasterType}
                    onChange={(e) => setDisasterType(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/[0.08] text-white text-[15px] rounded-xl px-3 py-2.5 outline-none focus:border-white/20 transition-colors"
                  >
                    <option value="earthquake">Earthquake</option>
                    <option value="flood">Flood</option>
                    <option value="hurricane">Hurricane</option>
                    <option value="wildfire">Wildfire</option>
                    <option value="tsunami">Tsunami</option>
                    <option value="drought">Drought</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-600 uppercase tracking-widest block mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Nepal"
                    className="w-full bg-white/[0.02] border border-white/[0.08] text-white text-[15px] rounded-xl px-3 py-2.5 outline-none focus:border-white/20 transition-colors placeholder:text-zinc-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-widest block mb-2">
                  Severity: {severity}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={severity}
                  onChange={(e) => setSeverity(Number(e.target.value))}
                  className="w-full accent-red-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-widest block mb-2">
                  Affected Causes
                </label>
                <div className="flex gap-2 flex-wrap">
                  {['health', 'shelter', 'food', 'education', 'water'].map((c) => (
                    <motion.button
                      key={c}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleCause(c)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border transition-all duration-300 ${
                        causes.includes(c)
                          ? 'bg-white text-black border-white'
                          : 'border-white/[0.08] text-zinc-500 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {c}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="mt-4 p-4 rounded-2xl bg-emerald-500/[0.05] border border-emerald-500/10 max-w-sm"
                >
                  <p className="text-sm font-bold text-emerald-400 uppercase tracking-widest">{message}</p>
                </motion.div>
              )}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="mt-4 p-4 rounded-2xl bg-red-500/[0.05] border border-red-500/10 max-w-sm"
                >
                  <p className="text-sm font-bold text-red-400 uppercase tracking-widest">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Balance Display */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-xs font-bold text-zinc-600 uppercase tracking-[0.4em] mb-6">Account Balances</h1>

            {/* Pool Balance */}
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-2">
                <Database size={14} className="text-zinc-700" />
                <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Pool Wallet</span>
              </div>
              <div className="flex items-baseline gap-3 mb-2">
                <motion.span
                  key={poolBalance}
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                  className="text-6xl md:text-7xl font-extralight text-white tracking-ultra-tight"
                >
                  {poolBalance?.toFixed(2) || '...'}
                </motion.span>
                <span className="text-xl font-light text-zinc-700 italic">XRP</span>
              </div>
              <a
                href={`${EXPLORER}/accounts/${xrplStatus?.accounts?.pool?.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-zinc-600 uppercase tracking-widest hover:text-white transition-colors"
              >
                View on Explorer
              </a>
            </div>

            {/* Reserve Balance */}
            <div className="pt-8 border-t border-white/[0.05]">
              <div className="flex items-center gap-2 mb-2">
                <Terminal size={14} className="text-zinc-700" />
                <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Reserve Wallet</span>
              </div>
              <div className="flex items-baseline gap-3 mb-2">
                <motion.span
                  key={reserveBalance}
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                  className="text-6xl md:text-7xl font-extralight text-emerald-400 tracking-ultra-tight"
                >
                  {reserveBalance?.toFixed(2) || '...'}
                </motion.span>
                <span className="text-xl font-light text-zinc-700 italic">XRP</span>
              </div>
              <a
                href={`${EXPLORER}/accounts/${xrplStatus?.accounts?.reserve?.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-emerald-500/50 uppercase tracking-widest hover:text-emerald-400 transition-colors"
              >
                View on Explorer
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Disaster Allocation History - Money Flow Tracking */}
      <div className="mb-20">
        <div className="flex items-center justify-between mb-8 border-b border-white/[0.03] pb-6">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-[0.3em] flex items-center gap-2 mb-1">
              <AlertCircle size={16} /> Emergency Allocations
            </h3>
            <p className="text-sm text-zinc-600 font-medium italic">Track every XRP from reserve to organization</p>
          </div>
          <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
            {disasters.length} Events
          </span>
        </div>

        {disasters.length === 0 ? (
          <div className="text-center py-20 border border-white/[0.05] rounded-[48px] bg-white/[0.01]">
            <Zap size={32} className="text-zinc-800 mx-auto mb-4" />
            <p className="text-sm font-bold text-zinc-700 uppercase tracking-[0.2em]">
              No emergencies triggered yet
            </p>
            <p className="text-xs text-zinc-800 mt-2 italic">Trigger an emergency to see allocation breakdown</p>
          </div>
        ) : (
          <div className="space-y-6">
            {disasters.map((d, idx) => (
              <DisasterAllocationCard key={d.disaster_id} disaster={d} index={idx} />
            ))}
          </div>
        )}
      </div>

      {/* Network Health Stats */}
      <div className="fixed bottom-8 right-8 hidden md:flex gap-8 p-5 glass-dark border border-white/5 rounded-3xl opacity-50 hover:opacity-100 transition-opacity">
        <div>
          <div className="text-sm font-bold text-zinc-600 uppercase tracking-widest mb-1">Protocol</div>
          <div className="text-sm font-medium text-white">XRPL Devnet</div>
        </div>
        <div>
          <div className="text-sm font-bold text-zinc-600 uppercase tracking-widest mb-1">Escrow Type</div>
          <div className="text-sm font-medium text-white">Batched</div>
        </div>
        <div>
          <div className="text-sm font-bold text-zinc-600 uppercase tracking-widest mb-1">Status</div>
          <div className="text-sm font-medium text-emerald-400">Active</div>
        </div>
      </div>

      {/* Emergency Flow Modal */}
      <EmergencyFlowModal
        isOpen={flowOpen}
        onClose={handleFlowClose}
        status={flowStatus}
        result={flowResult}
        error={flowError}
      />
    </div>
  )
}

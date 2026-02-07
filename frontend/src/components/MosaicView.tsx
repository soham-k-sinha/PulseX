import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Globe, ShieldCheck, ExternalLink, X,
  Heart, Home, Utensils, BookOpen, Droplets, Building
} from 'lucide-react'
import * as api from '../services/api'
import type { DisasterInfo, OrgEscrowInfo } from '../types'

const EXPLORER = import.meta.env.VITE_XRPL_EXPLORER_URL || 'https://devnet.xrpl.org'

const CAUSE_ICONS: Record<string, typeof Heart> = {
  health: Heart,
  shelter: Home,
  food: Utensils,
  education: BookOpen,
  water: Droplets,
}

interface TileData {
  disaster: DisasterInfo
  escrow: OrgEscrowInfo
}

export default function MosaicView() {
  const [tiles, setTiles] = useState<TileData[]>([])
  const [selected, setSelected] = useState<TileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalDistributed: 0, disasterCount: 0, orgCount: 0 })

  const loadData = async () => {
    try {
      const disasterRes = await api.getDisasters()
      const disasters: DisasterInfo[] = disasterRes.disasters || []

      const allTiles: TileData[] = []
      let totalXrp = 0
      const orgSet = new Set<number>()

      for (const d of disasters) {
        try {
          const detail = await api.getDisaster(d.disaster_id)
          const escrows: OrgEscrowInfo[] = detail.org_escrows || []
          for (const e of escrows) {
            allTiles.push({ disaster: d, escrow: e })
            totalXrp += e.amount_xrp
            orgSet.add(e.org_id)
          }
        } catch {
          // skip
        }
      }

      setTiles(allTiles)
      setStats({
        totalDistributed: totalXrp,
        disasterCount: disasters.length,
        orgCount: orgSet.size,
      })
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 15000)
    return () => clearInterval(interval)
  }, [])

  const getCauseIcon = (orgName: string) => {
    const lower = orgName.toLowerCase()
    if (lower.includes('hospital') || lower.includes('health')) return Heart
    if (lower.includes('shelter')) return Home
    if (lower.includes('ngo') || lower.includes('food')) return Utensils
    return Building
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-72px)]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 mx-auto border-2 border-white/10 border-t-white/40 rounded-full animate-spin mb-6" />
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Loading Mosaic</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="p-8 md:p-16 max-w-7xl mx-auto">
      {/* Hero Stats */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-20 text-center py-12"
      >
        <div className="inline-block px-12 py-10 rounded-[48px] border border-white/[0.05] bg-gradient-to-b from-white/[0.02] to-transparent mb-12">
          <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-4">Total Distributed</div>
          <div className="flex items-center justify-center gap-3">
            <span className="text-7xl md:text-8xl font-extralight text-white tracking-ultra-tight">
              {stats.totalDistributed.toFixed(0)}
            </span>
            <span className="text-2xl font-light text-zinc-700 italic">XRP</span>
          </div>
        </div>

        <div className="flex justify-center gap-20">
          {[
            { label: 'Disasters', val: String(stats.disasterCount), icon: <Globe size={16} /> },
            { label: 'Organizations', val: String(stats.orgCount), icon: <ShieldCheck size={16} /> },
            { label: 'Protocol', val: 'XRPL Escrow', icon: <Zap size={16} /> },
          ].map((stat, i) => (
            <div key={i} className="text-left group cursor-default">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-zinc-700 group-hover:text-white transition-colors">{stat.icon}</span>
                <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{stat.label}</div>
              </div>
              <div className="text-2xl font-light text-white tracking-tight">{stat.val}</div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Mosaic Grid */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-8 border-b border-white/[0.03] pb-6">
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-[0.3em] mb-1">Impact Mosaic</h2>
            <p className="text-[10px] text-zinc-600 font-medium italic">Visual distribution of fund allocations</p>
          </div>
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
            {tiles.length} Allocations
          </span>
        </div>

        {tiles.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 mx-auto rounded-[24px] border border-white/[0.05] bg-white/[0.01] flex items-center justify-center mb-8">
              <Zap size={32} className="text-zinc-800" />
            </div>
            <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-[0.2em] mb-2">
              No allocations yet
            </p>
            <p className="text-[9px] text-zinc-800 italic">
              Trigger an emergency from the Admin panel to see the mosaic
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tiles.map((t, i) => {
              const Icon = getCauseIcon(t.escrow.org_name)
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -8, scale: 1.01 }}
                  onClick={() => setSelected(t)}
                  className="group relative cursor-pointer"
                >
                  <div className="absolute inset-0 bg-white/[0.01] rounded-[32px] border border-white/[0.05] group-hover:bg-white/[0.03] group-hover:border-white/10 transition-colors duration-500" />
                  <div className="relative p-7 flex flex-col">
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center">
                        <Icon size={20} className="text-zinc-500 group-hover:text-white transition-colors duration-500" />
                      </div>
                      <div className="text-right">
                        {t.escrow.status === 'finished' ? (
                          <span className="text-[9px] font-bold text-emerald-500/80 uppercase tracking-widest">Released</span>
                        ) : (
                          <span className="text-[9px] font-bold text-yellow-500/80 uppercase tracking-widest">Locked</span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-silk transition-colors">
                      {t.escrow.org_name}
                    </h3>
                    <div className="text-[10px] text-zinc-500 font-medium capitalize mb-6">
                      {t.disaster.disaster_type} - {t.disaster.location}
                    </div>

                    <div className="mt-auto pt-5 border-t border-white/[0.03] flex items-center justify-between">
                      <div>
                        <div className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Amount</div>
                        <div className="text-sm font-semibold text-white/80">{t.escrow.amount_xrp.toFixed(2)} XRP</div>
                      </div>
                      <ShieldCheck size={14} className="text-zinc-700 group-hover:text-emerald-500/50 transition-colors" />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="absolute inset-0 bg-obsidian/90 backdrop-blur-2xl"
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-2xl bg-space border border-white/10 rounded-[48px] overflow-hidden shadow-2xl"
            >
              <div className="p-10 md:p-14">
                <button
                  onClick={() => setSelected(null)}
                  className="absolute top-8 right-8 p-3 rounded-full text-zinc-600 hover:text-white transition-colors border border-white/[0.03] hover:border-white/10"
                >
                  <X size={16} />
                </button>

                <div className="flex items-center gap-6 mb-12">
                  {(() => {
                    const Icon = getCauseIcon(selected.escrow.org_name)
                    return (
                      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center">
                        <Icon size={28} className="text-zinc-400" />
                      </div>
                    )
                  })()}
                  <div>
                    <h2 className="text-2xl font-light text-white tracking-tight mb-1">
                      {selected.escrow.org_name}
                    </h2>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest capitalize">
                      {selected.disaster.disaster_type} - {selected.disaster.location}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-8 pb-8 border-b border-white/[0.03]">
                    <div>
                      <h4 className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Amount</h4>
                      <div className="text-3xl font-extralight text-white">{selected.escrow.amount_xrp.toFixed(2)} XRP</div>
                    </div>
                    <div>
                      <h4 className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Status</h4>
                      <div className={`text-lg font-light ${selected.escrow.status === 'finished' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                        {selected.escrow.status === 'finished' ? 'Released' : 'Locked in Escrow'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-3">Escrow Created</h4>
                    <a
                      href={`${EXPLORER}/transactions/${selected.escrow.escrow_tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono tracking-tighter hover:text-white transition-colors break-all"
                    >
                      <ExternalLink size={12} className="flex-shrink-0" />
                      {selected.escrow.escrow_tx_hash}
                    </a>
                  </div>

                  {selected.escrow.finish_tx_hash && (
                    <div>
                      <h4 className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-3">Escrow Released</h4>
                      <a
                        href={`${EXPLORER}/transactions/${selected.escrow.finish_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[10px] text-emerald-400/80 font-mono tracking-tighter hover:text-emerald-300 transition-colors break-all"
                      >
                        <ExternalLink size={12} className="flex-shrink-0" />
                        {selected.escrow.finish_tx_hash}
                      </a>
                    </div>
                  )}

                  <div className="pt-4">
                    <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Disaster ID</div>
                    <div className="text-[10px] text-white/50 font-mono">{selected.disaster.disaster_id}</div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelected(null)}
                  className="w-full mt-10 py-3.5 bg-white/[0.03] border border-white/[0.08] text-[10px] font-bold text-zinc-400 uppercase tracking-widest rounded-2xl hover:bg-white/[0.06] hover:text-white transition-all"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

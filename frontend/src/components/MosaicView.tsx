import { useState, useEffect } from 'react'
import * as api from '../services/api'
import type { DisasterInfo, OrgEscrowInfo } from '../types'

const EXPLORER = import.meta.env.VITE_XRPL_EXPLORER_URL || 'https://devnet.xrpl.org'

const CAUSE_COLORS: Record<string, string> = {
  health: 'from-red-600 to-red-800 border-red-500',
  shelter: 'from-blue-600 to-blue-800 border-blue-500',
  food: 'from-green-600 to-green-800 border-green-500',
  education: 'from-purple-600 to-purple-800 border-purple-500',
  water: 'from-cyan-600 to-cyan-800 border-cyan-500',
}

const CAUSE_ICONS: Record<string, string> = {
  health: '🏥',
  shelter: '🏠',
  food: '🍚',
  education: '📚',
  water: '💧',
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

  const getCauseColor = (orgName: string) => {
    const lower = orgName.toLowerCase()
    if (lower.includes('hospital') || lower.includes('health')) return CAUSE_COLORS.health
    if (lower.includes('shelter')) return CAUSE_COLORS.shelter
    if (lower.includes('ngo') || lower.includes('food')) return CAUSE_COLORS.food
    return 'from-gray-600 to-gray-800 border-gray-500'
  }

  const getCauseIcon = (orgName: string) => {
    const lower = orgName.toLowerCase()
    if (lower.includes('hospital') || lower.includes('health')) return CAUSE_ICONS.health
    if (lower.includes('shelter')) return CAUSE_ICONS.shelter
    if (lower.includes('ngo') || lower.includes('food')) return CAUSE_ICONS.food
    return '🏢'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading mosaic...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
          <p className="text-2xl font-bold text-yellow-400">{stats.totalDistributed.toFixed(0)} XRP</p>
          <p className="text-xs text-gray-400">Total Distributed</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
          <p className="text-2xl font-bold text-red-400">{stats.disasterCount}</p>
          <p className="text-xs text-gray-400">Disasters Handled</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
          <p className="text-2xl font-bold text-blue-400">{stats.orgCount}</p>
          <p className="text-xs text-gray-400">Organizations Funded</p>
        </div>
      </div>

      {/* Mosaic Grid */}
      {tiles.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
          <p className="text-gray-400 text-lg">No allocations yet</p>
          <p className="text-gray-500 text-sm mt-2">
            Trigger an emergency from the Admin panel to see the mosaic
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tiles.map((t, i) => (
            <button
              key={i}
              onClick={() => setSelected(t)}
              className={`bg-gradient-to-br ${getCauseColor(t.escrow.org_name)} border rounded-xl p-4 text-left hover:scale-105 transition-transform cursor-pointer`}
            >
              <div className="text-2xl mb-2">{getCauseIcon(t.escrow.org_name)}</div>
              <p className="text-white font-semibold text-sm">{t.escrow.org_name}</p>
              <p className="text-white/80 text-lg font-bold">{t.escrow.amount_xrp.toFixed(0)} XRP</p>
              <p className="text-white/60 text-xs capitalize">
                {t.disaster.disaster_type} - {t.disaster.location}
              </p>
              <div className="mt-2">
                {t.escrow.status === 'finished' ? (
                  <span className="text-xs bg-green-500/30 text-green-300 px-2 py-0.5 rounded">
                    Released
                  </span>
                ) : (
                  <span className="text-xs bg-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded">
                    Locked
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-600">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {getCauseIcon(selected.escrow.org_name)} {selected.escrow.org_name}
                </h3>
                <p className="text-gray-400 text-sm capitalize">
                  {selected.disaster.disaster_type} - {selected.disaster.location}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-sm text-gray-400">Amount</p>
                <p className="text-xl font-bold text-white">{selected.escrow.amount_xrp.toFixed(2)} XRP</p>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-sm text-gray-400">Status</p>
                <p className={`font-semibold ${selected.escrow.status === 'finished' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {selected.escrow.status === 'finished' ? 'Released' : 'Locked in Escrow'}
                </p>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-sm text-gray-400 mb-1">Escrow Created</p>
                <a
                  href={`${EXPLORER}/transactions/${selected.escrow.escrow_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline text-sm break-all"
                >
                  {selected.escrow.escrow_tx_hash}
                </a>
              </div>

              {selected.escrow.finish_tx_hash && (
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-sm text-gray-400 mb-1">Escrow Released</p>
                  <a
                    href={`${EXPLORER}/transactions/${selected.escrow.finish_tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:underline text-sm break-all"
                  >
                    {selected.escrow.finish_tx_hash}
                  </a>
                </div>
              )}

              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-sm text-gray-400">Disaster ID</p>
                <p className="text-white text-sm font-mono">{selected.disaster.disaster_id}</p>
              </div>
            </div>

            <button
              onClick={() => setSelected(null)}
              className="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

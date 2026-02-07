import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Heart, Home, Utensils, BookOpen, Droplets, Shield,
  TrendingUp, Lock, CheckCircle, Database, ExternalLink, ChevronDown,
  ArrowRight, Calendar, Zap
} from 'lucide-react'
import * as api from '../services/api'
import type { Organization, XRPLStatus, DisasterInfo } from '../types'

const EXPLORER = import.meta.env.VITE_XRPL_EXPLORER_URL || 'https://devnet.xrpl.org'

const CAUSE_ICONS: Record<string, typeof Heart> = {
  health: Heart,
  shelter: Home,
  food: Utensils,
  education: BookOpen,
  water: Droplets,
}

interface OrgEscrowDetail {
  disaster_id: string
  disaster_type: string
  location: string
  severity: number
  amount_xrp: number
  status: string
  escrow_tx_hash: string
  finish_tx_hash: string | null
  created_at: string
  finished_at: string | null
}

export default function OrganizationsView() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [xrplStatus, setXrplStatus] = useState<XRPLStatus | null>(null)
  const [orgEscrows, setOrgEscrows] = useState<OrgEscrowDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Stats for selected org
  const [totalReceived, setTotalReceived] = useState(0)
  const [lockedInEscrow, setLockedInEscrow] = useState(0)

  const loadOrgs = async () => {
    try {
      const [orgRes, xrpl] = await Promise.all([
        api.getOrganizations(),
        api.getXRPLStatus(),
      ])

      const organizations: Organization[] = orgRes.organizations || []
      setOrgs(organizations)
      setXrplStatus(xrpl)

      // Auto-select first org if none selected
      if (!selectedOrg && organizations.length > 0) {
        setSelectedOrg(organizations[0])
      }
    } catch (err) {
      console.error('Failed to load organizations:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadOrgDetails = async (org: Organization) => {
    try {
      // Get all disasters and filter escrows for this org
      const disasters = await api.getDisasters()
      const disasterList = disasters.disasters || []

      const escrowDetails: OrgEscrowDetail[] = []
      let locked = 0

      for (const disaster of disasterList) {
        try {
          const detail = await api.getDisaster(disaster.disaster_id)
          const orgEscrowsForDisaster = (detail.org_escrows || []).filter(
            (e: any) => e.org_id === org.org_id
          )

          for (const escrow of orgEscrowsForDisaster) {
            escrowDetails.push({
              disaster_id: disaster.disaster_id,
              disaster_type: disaster.disaster_type,
              location: disaster.location,
              severity: disaster.severity,
              amount_xrp: escrow.amount_xrp,
              status: escrow.status,
              escrow_tx_hash: escrow.escrow_tx_hash,
              finish_tx_hash: escrow.finish_tx_hash,
              created_at: escrow.created_at || '',
              finished_at: escrow.finished_at,
            })

            if (escrow.status !== 'finished') {
              locked += escrow.amount_xrp
            }
          }
        } catch {
          // skip
        }
      }

      setOrgEscrows(escrowDetails.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ))
      setTotalReceived(org.total_received_xrp || 0)
      setLockedInEscrow(locked)
    } catch (err) {
      console.error('Failed to load org details:', err)
    }
  }

  useEffect(() => {
    loadOrgs()
  }, [])

  useEffect(() => {
    if (selectedOrg) {
      loadOrgDetails(selectedOrg)
    }
  }, [selectedOrg])

  const getCauseIcon = (causeType: string) => {
    return CAUSE_ICONS[causeType.toLowerCase()] || Building2
  }

  const reserveBalance = xrplStatus?.accounts?.reserve?.balance_xrp || 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-72px)]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 mx-auto border-2 border-white/10 border-t-white/40 rounded-full animate-spin mb-6" />
          <p className="text-sm font-bold text-zinc-600 uppercase tracking-[0.2em]">Loading Dashboard</p>
        </motion.div>
      </div>
    )
  }

  if (orgs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-72px)]">
        <div className="text-center">
          <Building2 size={48} className="text-zinc-800 mx-auto mb-6" />
          <p className="text-sm font-bold text-zinc-700 uppercase tracking-[0.2em]">
            No organizations registered
          </p>
        </div>
      </div>
    )
  }

  const Icon = selectedOrg ? getCauseIcon(selectedOrg.cause_type) : Building2

  return (
    <div className="p-8 md:p-16 max-w-7xl mx-auto">
      {/* Organization Selector */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={14} className="text-zinc-600" />
          <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
            Select Organization
          </span>
        </div>

        <div className="relative max-w-md">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full p-5 rounded-[24px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all flex items-center justify-between group"
          >
            {selectedOrg ? (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center">
                  <Icon size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
                </div>
                <div className="text-left">
                  <div className="text-base font-semibold text-white mb-0.5">{selectedOrg.name}</div>
                  <div className="text-sm text-zinc-500 capitalize">{selectedOrg.cause_type}</div>
                </div>
              </div>
            ) : (
              <span className="text-sm text-zinc-500">Select an organization...</span>
            )}
            <ChevronDown size={16} className={`text-zinc-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 right-0 mt-2 p-2 rounded-[20px] border border-white/[0.08] bg-space backdrop-blur-xl shadow-2xl z-50 max-h-80 overflow-y-auto"
              >
                {orgs.map((org) => {
                  const OrgIcon = getCauseIcon(org.cause_type)
                  return (
                    <button
                      key={org.org_id}
                      onClick={() => {
                        setSelectedOrg(org)
                        setDropdownOpen(false)
                      }}
                      className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all ${
                        selectedOrg?.org_id === org.org_id
                          ? 'bg-white/[0.08] border border-white/[0.1]'
                          : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center">
                        <OrgIcon size={16} className="text-zinc-600" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="text-sm font-medium text-white">{org.name}</div>
                        <div className="text-xs text-zinc-500 capitalize">{org.cause_type}</div>
                      </div>
                      {selectedOrg?.org_id === org.org_id && (
                        <CheckCircle size={14} className="text-emerald-500" />
                      )}
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Organization Dashboard */}
      {selectedOrg && (
        <motion.div
          key={selectedOrg.org_id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Hero Stats */}
          <section className="mb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Total Received */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-8 rounded-[32px] border border-white/[0.05] bg-white/[0.01] relative overflow-hidden group hover:border-emerald-500/20 transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={14} className="text-emerald-500/60" />
                    <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
                      Total Received
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl font-extralight text-white tracking-tight">
                      {totalReceived.toFixed(2)}
                    </span>
                    <span className="text-lg font-light text-zinc-700 italic">XRP</span>
                  </div>
                  <p className="text-xs text-zinc-600 italic">All-time funds received</p>
                </div>
              </motion.div>

              {/* Locked in Escrow */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-8 rounded-[32px] border border-white/[0.05] bg-white/[0.01] relative overflow-hidden group hover:border-yellow-500/20 transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <Lock size={14} className="text-yellow-500/60" />
                    <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
                      Locked in Escrow
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl font-extralight text-yellow-400 tracking-tight">
                      {lockedInEscrow.toFixed(2)}
                    </span>
                    <span className="text-lg font-light text-zinc-700 italic">XRP</span>
                  </div>
                  <p className="text-xs text-zinc-600 italic">Awaiting automatic release</p>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Wallet & Reserve Info */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">
            {/* Wallet Address */}
            <div className="p-8 rounded-[32px] border border-white/[0.05] bg-white/[0.01]">
              <div className="flex items-center gap-2 mb-6">
                <Shield size={14} className="text-zinc-600" />
                <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
                  Organization Wallet
                </span>
              </div>
              <div className="mb-4">
                <div className="text-sm font-bold text-zinc-600 uppercase tracking-widest mb-2">
                  XRPL Address
                </div>
                <div className="text-sm text-white/80 font-mono tracking-tighter break-all mb-3">
                  {selectedOrg.wallet_address}
                </div>
                <a
                  href={`${EXPLORER}/accounts/${selectedOrg.wallet_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold text-zinc-600 uppercase tracking-widest hover:text-emerald-400 transition-colors"
                >
                  <ExternalLink size={10} />
                  View on Explorer
                </a>
              </div>
              <div className="pt-4 border-t border-white/[0.05]">
                <div className="text-sm font-bold text-zinc-600 uppercase tracking-widest mb-1">
                  Need Score
                </div>
                <div className="text-2xl font-light text-white">
                  {selectedOrg.need_score}/10
                </div>
              </div>
            </div>

            {/* Reserve Pool */}
            <div className="p-8 rounded-[32px] border border-emerald-500/10 bg-gradient-to-br from-emerald-500/[0.02] to-transparent">
              <div className="flex items-center gap-2 mb-6">
                <Database size={14} className="text-emerald-500/60" />
                <span className="text-xs font-bold text-emerald-600/80 uppercase tracking-widest">
                  Reserve Pool Status
                </span>
              </div>
              <div className="mb-3">
                <div className="text-sm font-bold text-zinc-600 uppercase tracking-widest mb-2">
                  Available for Allocation
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extralight text-emerald-400 tracking-tight">
                    {reserveBalance.toFixed(2)}
                  </span>
                  <span className="text-lg font-light text-zinc-700 italic">XRP</span>
                </div>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed italic">
                This is the total amount available in the reserve pool that can be allocated to matching organizations during emergencies.
              </p>
            </div>
          </section>

          {/* Allocation History */}
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8 border-b border-white/[0.03] pb-6">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-[0.3em] flex items-center gap-2 mb-1">
                  <Calendar size={16} /> Allocation History
                </h3>
                <p className="text-sm text-zinc-600 font-medium italic">
                  All emergency allocations received by {selectedOrg.name}
                </p>
              </div>
              <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
                {orgEscrows.length} Allocations
              </span>
            </div>

            {orgEscrows.length === 0 ? (
              <div className="text-center py-20 border border-white/[0.05] rounded-[32px] bg-white/[0.01]">
                <Zap size={32} className="text-zinc-800 mx-auto mb-4" />
                <p className="text-sm font-bold text-zinc-700 uppercase tracking-[0.2em]">
                  No allocations yet
                </p>
                <p className="text-xs text-zinc-800 mt-2 italic">
                  You'll receive funds when emergencies match your cause type
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orgEscrows.map((escrow, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-6 rounded-[28px] border border-white/[0.05] bg-white/[0.01] hover:border-white/[0.08] transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <ArrowRight size={14} className="text-emerald-500/60" />
                          <h4 className="text-base font-semibold text-white capitalize">
                            {escrow.disaster_type} - {escrow.location}
                          </h4>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold text-zinc-600 uppercase tracking-widest">
                          <span>Severity: {escrow.severity}/10</span>
                          <span>•</span>
                          <span>{new Date(escrow.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-light text-white mb-1">
                          {escrow.amount_xrp.toFixed(3)} XRP
                        </div>
                        <span
                          className={`text-xs font-bold uppercase tracking-widest ${
                            escrow.status === 'finished' ? 'text-emerald-500' : 'text-yellow-500'
                          }`}
                        >
                          {escrow.status === 'finished' ? '✓ Released' : '⏳ Locked'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-4 border-t border-white/[0.03]">
                      <a
                        href={`${EXPLORER}/transactions/${escrow.escrow_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-zinc-600 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                      >
                        <ExternalLink size={10} />
                        Escrow Transaction
                      </a>
                      {escrow.finish_tx_hash && (
                        <>
                          <span className="text-zinc-800">•</span>
                          <a
                            href={`${EXPLORER}/transactions/${escrow.finish_tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-500/60 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                          >
                            <ExternalLink size={10} />
                            Release Transaction
                          </a>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </motion.div>
      )}
    </div>
  )
}

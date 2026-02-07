import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Lock, Eye, Zap, ArrowRight, ExternalLink } from 'lucide-react'
import EscrowFlowViz from './EscrowFlowViz'
import WalletConnect from './WalletConnect'
import * as api from '../services/api'
import type { WalletInfo } from '../services/wallet'

interface Props {
  onConnect: (wallet: WalletInfo) => void
}

export default function LandingHero({ onConnect }: Props) {
  const [stats, setStats] = useState({ distributed: 0, disasters: 0, orgs: 0 })

  useEffect(() => {
    async function load() {
      try {
        const [dis, orgRes] = await Promise.all([api.getDisasters(), api.getOrganizations()])
        const disasters = dis.disasters || []
        setStats({
          distributed: disasters.reduce((s: number, d: any) => s + (d.total_allocated_xrp || 0), 0),
          disasters: disasters.length,
          orgs: (orgRes.organizations || []).length,
        })
      } catch { /* silent */ }
    }
    load()
  }, [])

  return (
    <div className="min-h-[calc(100vh-72px)] flex flex-col">
      {/* Hero section */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pt-12 pb-4 relative">
        {/* Background accent orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/[0.03] blur-[100px] animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald-600/[0.03] blur-[100px] animate-float-reverse" />
        </div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] mb-10"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-glow" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.25em]">
            Powered by XRPL and RLUSD Escrow Protocol
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.15 }}
          className="text-6xl md:text-8xl font-extralight tracking-tight text-center mb-5"
        >
          <span className="text-silk">Pulse X</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-lg md:text-xl font-light text-zinc-500 text-center max-w-xl mb-4 leading-relaxed"
        >
          Transparent emergency relief on the XRP and RLUSD Ledger
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-sm text-zinc-600 text-center max-w-lg mb-14 leading-relaxed"
        >
          Every donation is traceable on-chain. XRPL and RLUSD escrow ensures funds reach
          relief organizations — trustlessly, automatically, verifiably.
        </motion.p>

        {/* Flow Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="w-full max-w-5xl mb-16 px-4"
        >
          <div className="relative p-6 rounded-[32px] border border-white/[0.04] bg-white/[0.01]">
            <EscrowFlowViz animated={true} />
            {/* Corner tag */}
            <div className="absolute top-4 right-6 flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-[0.2em]">Live Pipeline</span>
            </div>
          </div>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="grid grid-cols-3 gap-5 max-w-3xl w-full mb-16 px-4"
        >
          {[
            {
              icon: Lock,
              title: 'Trustless Escrow',
              desc: 'XRPL and RLUSD native escrow locks funds with time-based conditions. No intermediary can redirect donations.',
              accent: '#FBBF24',
            },
            {
              icon: Eye,
              title: 'Fully Traceable',
              desc: 'Every XRP and RLUSD tracked from donor to organization. Verify any transaction on the XRPL Explorer.',
              accent: '#34D399',
            },
            {
              icon: Zap,
              title: 'Batched Efficiency',
              desc: 'Donations intelligently batched to minimize fees. More of your XRP and RLUSD goes directly to relief.',
              accent: '#818CF8',
            },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 + i * 0.1, duration: 0.6 }}
              className="group p-6 rounded-[24px] border border-white/[0.04] bg-white/[0.01] hover:border-white/[0.1] hover:bg-white/[0.02] transition-all duration-500"
            >
              <div
                className="w-10 h-10 rounded-xl border border-white/[0.06] flex items-center justify-center mb-4 group-hover:border-white/10 transition-colors"
                style={{ backgroundColor: `${f.accent}08` }}
              >
                <f.icon size={18} style={{ color: f.accent }} className="opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="flex flex-col items-center gap-6 mb-16"
        >
          <WalletConnect
            wallet={null}
            onConnect={onConnect}
            onDisconnect={() => {}}
          />
          <p className="text-[10px] text-zinc-700 uppercase tracking-[0.2em] font-bold">
            Connect your Crossmark wallet to donate
          </p>
        </motion.div>
      </div>

      {/* Bottom stats bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="border-t border-white/[0.03] py-8 px-8"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-16">
            {[
              { label: 'XRP Distributed', val: stats.distributed > 0 ? `${stats.distributed.toFixed(0)} XRP` : '---' },
              { label: 'Emergencies', val: stats.disasters > 0 ? String(stats.disasters) : '---' },
              { label: 'Organizations', val: stats.orgs > 0 ? String(stats.orgs) : '---' },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.2em] mb-1">{s.label}</div>
                <div className="text-base font-light text-white">{s.val}</div>
              </div>
            ))}
          </div>
          <a
            href="https://devnet.xrpl.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] hover:text-white transition-colors"
          >
            XRPL Explorer <ExternalLink size={10} />
          </a>
        </div>
      </motion.div>
    </div>
  )
}

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Activity } from 'lucide-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import WalletConnect from './components/WalletConnect'
import LandingHero from './components/LandingHero'
import DonorDashboard from './components/DonorDashboard'
import AdminPanel from './components/AdminPanel'
import OrganizationsView from './components/OrganizationsView'
import { useWebSocket } from './hooks/useWebSocket'
import type { WalletInfo } from './services/wallet'

const queryClient = new QueryClient()

type Tab = 'donate' | 'command' | 'organizations'

const TAB_CONFIG = [
  { key: 'donate' as Tab, label: 'Donate' },
  { key: 'command' as Tab, label: 'Command' },
  { key: 'organizations' as Tab, label: 'Organizations' },
]

function AppContent() {
  const [tab, setTab] = useState<Tab>('donate')
  const [wallet, setWallet] = useState<WalletInfo | null>(null)

  const onWsMessage = useCallback((data: any) => {
    console.log('WS event:', data)
  }, [])

  const { connected } = useWebSocket(onWsMessage)

  return (
    <div className="min-h-screen bg-obsidian text-zinc-400 selection:bg-white selection:text-black relative">
      {/* Liquid Background */}
      <div className="liquid-bg">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-[72px] z-50 flex items-center justify-between px-6 md:px-10 border-b border-white/[0.03] glass-dark">
        <div className="flex items-center gap-8 md:gap-16">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setWallet(null); setTab('donate') }}>
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-black">
              <Zap size={16} fill="black" />
            </div>
            <span className="text-sm font-bold tracking-[0.3em] text-white uppercase">PulseX</span>
          </div>

          {/* Navigation Tabs — only show when wallet connected */}
          {wallet && (
            <nav className="flex items-center gap-1">
              {TAB_CONFIG.map((t) => (
                <motion.button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative px-5 py-2 rounded-full text-sm font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
                    tab === t.key
                      ? 'bg-white text-black'
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {t.label}
                </motion.button>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-6">
          {/* Status Indicators */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">XRPL</span>
              <span className="text-xs bg-white/[0.03] text-zinc-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-white/[0.05]">
                Devnet
              </span>
            </div>
            {connected && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-glow" />
                <span className="text-xs font-bold text-emerald-500/80 uppercase tracking-widest">Live</span>
              </div>
            )}
          </div>

          {/* Wallet */}
          {wallet && (
            <WalletConnect
              wallet={wallet}
              onConnect={setWallet}
              onDisconnect={() => setWallet(null)}
            />
          )}
        </div>
      </header>

      {/* Content */}
      <main className="pt-[72px] min-h-[calc(100vh-72px)]">
        <AnimatePresence mode="wait">
          {!wallet ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <LandingHero onConnect={setWallet} />
            </motion.div>
          ) : (
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {tab === 'donate' && <DonorDashboard wallet={wallet} />}
              {tab === 'command' && <AdminPanel />}
              {tab === 'organizations' && <OrganizationsView />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.03] py-6 mt-8">
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Activity size={12} className="text-zinc-700" />
            <span className="text-xs font-bold text-zinc-700 uppercase tracking-widest">
              Built on XRPL | Batched Escrow Protocol
            </span>
          </div>
          <a
            href="https://devnet.xrpl.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-zinc-600 uppercase tracking-widest hover:text-white transition-colors"
          >
            XRPL Explorer
          </a>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

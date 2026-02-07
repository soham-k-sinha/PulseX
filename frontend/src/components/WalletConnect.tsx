import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, LogOut, AlertCircle, Loader2 } from 'lucide-react'
import { connectWallet, isCrossmarkInstalled, WalletInfo } from '../services/wallet'

interface Props {
  wallet: WalletInfo | null
  onConnect: (wallet: WalletInfo) => void
  onDisconnect: () => void
}

export default function WalletConnect({ wallet, onConnect, onDisconnect }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConnect = async () => {
    setError('')
    setLoading(true)
    try {
      const w = await connectWallet()
      onConnect(w)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (wallet) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-white/[0.05] bg-white/[0.02]">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
          <span className="text-sm font-bold text-white/70 font-mono tracking-tighter">
            {wallet.address.slice(0, 8)}...{wallet.address.slice(-4)}
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onDisconnect}
          className="text-zinc-600 hover:text-white transition-colors"
        >
          <LogOut size={14} />
        </motion.button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleConnect}
        disabled={loading}
        className="relative overflow-hidden flex items-center justify-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded-full text-sm uppercase tracking-[0.2em] transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] disabled:opacity-50"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <>
            <Wallet size={14} />
            Connect Wallet
          </>
        )}
        <div className="absolute inset-0 shimmer opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
      </motion.button>

      <AnimatePresence>
        {!isCrossmarkInstalled() && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-1.5 mt-1"
          >
            <AlertCircle size={10} className="text-yellow-500/60" />
            <span className="text-xs font-bold text-yellow-500/60 uppercase tracking-widest">
              Crossmark not detected.{' '}
              <a
                href="https://crossmark.io"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-yellow-400 transition-colors"
              >
                Install
              </a>
            </span>
          </motion.div>
        )}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-xs font-bold text-red-400/80 uppercase tracking-widest mt-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

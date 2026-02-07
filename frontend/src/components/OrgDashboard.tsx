import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Wallet, Eye, EyeOff, Copy, Check, TrendingDown,
  ArrowRight, Loader2, CheckCircle, DollarSign, ExternalLink
} from 'lucide-react'
import * as api from '../services/api'

const EXPLORER = import.meta.env.VITE_XRPL_EXPLORER_URL || 'https://devnet.xrpl.org'

interface Props {
  orgEmail: string
  isWalletConnected: boolean
  connectedWalletAddress: string | null
  onLogout: () => void
}

export default function OrgDashboard({ orgEmail, isWalletConnected, connectedWalletAddress, onLogout }: Props) {
  const [orgs, setOrgs] = useState<any[]>([])
  const [selectedOrg, setSelectedOrg] = useState<any>(null)
  const [availableXRP, setAvailableXRP] = useState(0)
  const [lockedXRP, setLockedXRP] = useState(0)
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawn, setWithdrawn] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [transferred, setTransferred] = useState(false)

  // Fake wallet key for demo
  const fakeWalletKey = 'sEdV8M9X2K...' + '•'.repeat(20) + '...aB3cD4eF5g'

  useEffect(() => {
    loadOrgData()
  }, [])

  const loadOrgData = async () => {
    try {
      // Load all orgs
      const orgRes = await api.getOrganizations()
      const organizations = orgRes.organizations || []
      setOrgs(organizations)

      // Auto-select first org for demo
      if (organizations.length > 0) {
        const org = organizations[0]
        setSelectedOrg(org)

        // Available to withdraw = total received by org (this is what they've actually gotten)
        setAvailableXRP(org.total_received_xrp || 0)

        // Calculate locked amount from disasters (escrows not yet finished)
        const disasters = await api.getDisasters()
        let locked = 0

        for (const disaster of disasters.disasters || []) {
          try {
            const detail = await api.getDisaster(disaster.disaster_id)
            const orgEscrows = (detail.org_escrows || []).filter(
              (e: any) => e.org_id === org.org_id
            )

            for (const escrow of orgEscrows) {
              // Only count as locked if NOT finished (still in escrow)
              if (escrow.status !== 'finished') {
                locked += escrow.amount_xrp
              }
            }
          } catch {}
        }

        setLockedXRP(locked)
      }
    } catch (err) {
      console.error('Failed to load org data:', err)
    }
  }

  const handleCopyKey = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWithdraw = () => {
    setWithdrawing(true)
    // Simulate withdrawal process
    setTimeout(() => {
      setWithdrawing(false)
      setWithdrawn(true)
      // Animate balance to 0
      const step = availableXRP / 50
      let current = availableXRP
      const interval = setInterval(() => {
        current -= step
        if (current <= 0) {
          setAvailableXRP(0)
          clearInterval(interval)
        } else {
          setAvailableXRP(current)
        }
      }, 20)
    }, 3000)
  }

  const handleTransfer = () => {
    setTransferring(true)
    // Simulate transfer to connected wallet
    setTimeout(() => {
      setTransferring(false)
      setTransferred(true)
      // Animate balance to 0
      const step = availableXRP / 50
      let current = availableXRP
      const interval = setInterval(() => {
        current -= step
        if (current <= 0) {
          setAvailableXRP(0)
          clearInterval(interval)
        } else {
          setAvailableXRP(current)
        }
      }, 20)
    }, 3000)
  }

  if (!selectedOrg) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-72px)]">
        <div className="w-12 h-12 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 md:p-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-3xl font-extralight text-white tracking-tight mb-2">
            {selectedOrg.name}
          </h1>
          <p className="text-sm text-zinc-600">
            {orgEmail} • <span className="capitalize">{selectedOrg.cause_type}</span>
          </p>
        </div>
        <button
          onClick={onLogout}
          className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Welcome Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 p-6 rounded-[32px] bg-emerald-500/[0.05] border border-emerald-500/10"
      >
        <div className="flex items-start gap-4">
          <CheckCircle size={24} className="text-emerald-500 flex-shrink-0 mt-1" />
          <div>
            {isWalletConnected ? (
              <>
                <h2 className="text-lg font-semibold text-white mb-2">
                  Wallet Connected - Instant Emergency Fund Access
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Your XRPL wallet is connected. You'll receive emergency funds instantly when disasters are declared.
                  All transactions are transparent and verifiable on the XRP Ledger.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-white mb-2">
                  Welcome! We've created an XRPL wallet for you
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Your organization now has a secure blockchain wallet to receive emergency funds.
                  All transactions are transparent and verifiable on the XRP Ledger.
                </p>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Wallet Details */}
      <div className={`grid grid-cols-1 ${isWalletConnected ? 'md:grid-cols-2' : 'md:grid-cols-2'} gap-6 mb-12`}>
        {/* Connected Crossmark Wallet (for wallet-connected orgs) */}
        {isWalletConnected && connectedWalletAddress && (
          <div className="p-6 rounded-[32px] border border-emerald-500/20 bg-emerald-500/[0.02]">
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={16} className="text-emerald-500" />
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">
                Your Connected Crossmark Wallet
              </span>
            </div>
            <div className="mb-3">
              <div className="text-sm text-white font-mono break-all">
                {connectedWalletAddress}
              </div>
            </div>
            <a
              href={`${EXPLORER}/accounts/${connectedWalletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-widest hover:text-emerald-400 transition-colors"
            >
              <ExternalLink size={10} />
              View on Explorer
            </a>
          </div>
        )}

        {/* Custodial Wallet Address */}
        <div className="p-6 rounded-[32px] border border-white/[0.05] bg-white/[0.01]">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={16} className="text-zinc-600" />
            <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
              {isWalletConnected ? 'Platform Holding Wallet' : 'XRPL Wallet Address'}
            </span>
          </div>
          <div className="mb-3">
            <div className="text-sm text-white font-mono break-all">
              {selectedOrg.wallet_address}
            </div>
          </div>
          <a
            href={`${EXPLORER}/accounts/${selectedOrg.wallet_address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-600 uppercase tracking-widest hover:text-emerald-400 transition-colors"
          >
            <ExternalLink size={10} />
            View on Explorer
          </a>
        </div>

        {/* Private Key (Demo Only) - Only show for custodial accounts */}
        {!isWalletConnected && (
          <div className="p-6 rounded-[32px] border border-amber-500/10 bg-amber-500/[0.02]">
            <div className="flex items-center gap-2 mb-4">
              <Eye size={16} className="text-amber-600" />
              <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">
                Private Key (Demo)
              </span>
            </div>
            <div className="mb-3">
              <div className="text-sm text-white font-mono">
                {showKey ? fakeWalletKey : '•'.repeat(64)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowKey(!showKey)}
                className="text-xs font-bold text-amber-600 uppercase tracking-widest hover:text-amber-400 transition-colors"
              >
                {showKey ? <EyeOff size={12} className="inline mr-1" /> : <Eye size={12} className="inline mr-1" />}
                {showKey ? 'Hide' : 'Show'}
              </button>
              <button
                onClick={handleCopyKey}
                className="text-xs font-bold text-amber-600 uppercase tracking-widest hover:text-amber-400 transition-colors"
              >
                {copied ? <Check size={12} className="inline mr-1" /> : <Copy size={12} className="inline mr-1" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Available Funds / Available to Withdraw */}
        <div className="p-8 rounded-[32px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.05] to-transparent relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.05] to-transparent" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown size={16} className="text-emerald-500" />
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">
                {isWalletConnected ? 'Funds Available' : 'Available to Withdraw'}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <motion.span
                key={availableXRP}
                className="text-5xl font-extralight text-emerald-400 tracking-tight"
              >
                {availableXRP.toFixed(2)}
              </motion.span>
              <span className="text-lg font-light text-zinc-700 italic">XRP</span>
            </div>
            <p className="text-xs text-zinc-600 italic">
              {isWalletConnected
                ? `≈ $${(availableXRP * 2.5).toFixed(2)} USD • Already in your wallet`
                : `≈ $${(availableXRP * 2.5).toFixed(2)} USD`
              }
            </p>
          </div>
        </div>

        {/* Locked in Escrow */}
        <div className="p-8 rounded-[32px] border border-white/[0.05] bg-white/[0.01]">
          <div className="flex items-center gap-2 mb-4">
            <Loader2 size={16} className="text-yellow-500" />
            <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
              Locked in Escrow
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-5xl font-extralight text-yellow-400 tracking-tight">
              {lockedXRP.toFixed(2)}
            </span>
            <span className="text-lg font-light text-zinc-700 italic">XRP</span>
          </div>
          <p className="text-xs text-zinc-600 italic">
            Releasing automatically soon
          </p>
        </div>
      </div>

      {/* Withdraw Section - Only for custodial accounts */}
      {!isWalletConnected && availableXRP > 0 && !withdrawn && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-[32px] border border-white/[0.05] bg-white/[0.01] text-center"
        >
          <DollarSign size={48} className="text-emerald-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Ready to Withdraw
          </h3>
          <p className="text-sm text-zinc-600 mb-6 max-w-md mx-auto">
            Convert your XRP to USD and receive funds directly in your bank account.
            Processing typically takes 1-2 business days.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm uppercase tracking-[0.2em] rounded-2xl transition-all duration-300 disabled:opacity-50 inline-flex items-center gap-3"
          >
            {withdrawing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Processing Withdrawal...
              </>
            ) : (
              <>
                <ArrowRight size={20} />
                Withdraw to Bank Account
              </>
            )}
          </motion.button>
        </motion.div>
      )}

      {/* Transfer to Connected Wallet - Only for wallet-connected accounts */}
      {isWalletConnected && availableXRP > 0 && !transferred && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-[32px] border border-emerald-500/10 bg-emerald-500/[0.02] text-center"
        >
          <Wallet size={48} className="text-emerald-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Ready to Transfer
          </h3>
          <p className="text-sm text-zinc-600 mb-6 max-w-md mx-auto">
            Transfer your emergency funds from the platform holding wallet directly to your connected Crossmark wallet.
            This typically takes just a few seconds.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleTransfer}
            disabled={transferring}
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm uppercase tracking-[0.2em] rounded-2xl transition-all duration-300 disabled:opacity-50 inline-flex items-center gap-3"
          >
            {transferring ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Transferring to Your Wallet...
              </>
            ) : (
              <>
                <ArrowRight size={20} />
                Transfer to My Crossmark Wallet
              </>
            )}
          </motion.button>
        </motion.div>
      )}

      {/* Withdrawal Success */}
      <AnimatePresence>
        {withdrawn && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-obsidian/90 backdrop-blur-xl"
          >
            <div className="max-w-md w-full p-10 rounded-[48px] border border-emerald-500/20 bg-space text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <CheckCircle size={64} className="text-emerald-500 mx-auto mb-6" />
              </motion.div>
              <h2 className="text-2xl font-semibold text-white mb-3">
                Withdrawal Successful!
              </h2>
              <p className="text-sm text-zinc-400 mb-8">
                Your funds have been converted to USD and will arrive in your bank account within 1-2 business days.
              </p>
              <button
                onClick={() => setWithdrawn(false)}
                className="px-6 py-3 bg-white/[0.05] hover:bg-white/[0.1] text-white text-sm font-bold uppercase tracking-widest rounded-2xl transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transfer Success */}
      <AnimatePresence>
        {transferred && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-obsidian/90 backdrop-blur-xl"
          >
            <div className="max-w-md w-full p-10 rounded-[48px] border border-emerald-500/20 bg-space text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <CheckCircle size={64} className="text-emerald-500 mx-auto mb-6" />
              </motion.div>
              <h2 className="text-2xl font-semibold text-white mb-3">
                Transfer Successful!
              </h2>
              <p className="text-sm text-zinc-400 mb-4">
                Your emergency funds have been transferred to your Crossmark wallet.
              </p>
              {connectedWalletAddress && (
                <div className="mb-8 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                  <p className="text-xs text-zinc-600 mb-2">Transferred to:</p>
                  <p className="text-sm text-white font-mono break-all">
                    {connectedWalletAddress}
                  </p>
                </div>
              )}
              <button
                onClick={() => setTransferred(false)}
                className="px-6 py-3 bg-white/[0.05] hover:bg-white/[0.1] text-white text-sm font-bold uppercase tracking-widest rounded-2xl transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Footer */}
      <div className="mt-12 p-6 rounded-[32px] bg-white/[0.01] border border-white/[0.05]">
        <div className="flex items-start gap-3">
          <Building2 size={16} className="text-zinc-700 mt-1 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
              About Your {isWalletConnected ? 'Connected Wallet' : 'Custodial Wallet'}
            </h4>
            <p className="text-xs text-zinc-600 leading-relaxed">
              {isWalletConnected ? (
                <>
                  You're using your Crossmark wallet for instant fund access. Emergency funds are initially held in a
                  platform wallet (locked in escrows for transparency), then you can transfer them to your connected
                  Crossmark wallet with one click. You maintain complete control of your private keys.
                  This demo simulates the transfer for presentation purposes.
                </>
              ) : (
                <>
                  Your XRPL wallet is managed securely by the platform. All incoming funds are locked in blockchain escrows
                  for transparency and security. When released, you can withdraw anytime to your bank account.
                  This demo simulates the withdrawal process for presentation purposes.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

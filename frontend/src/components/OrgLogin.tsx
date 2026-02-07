import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Mail, Lock, LogIn, Wallet, ArrowRight, Zap, AlertCircle } from 'lucide-react'
import { connectWallet, isCrossmarkInstalled } from '../services/wallet'

interface Props {
  onLogin: (email: string, isWalletConnected: boolean, walletAddress?: string) => void
}

export default function OrgLogin({ onLogin }: Props) {
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    setTimeout(() => {
      onLogin(email, false) // custodial account
    }, 1000)
  }

  const handleWalletConnect = async () => {
    setError('')
    setLoading(true)
    try {
      const wallet = await connectWallet()
      onLogin(wallet.address, true, wallet.address) // non-custodial, wallet connected
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-72px)] p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center">
            <Building2 size={32} className="text-emerald-500" />
          </div>
          <h1 className="text-3xl font-extralight text-white tracking-tight mb-3">
            Organization Portal
          </h1>
          <p className="text-sm text-zinc-600 italic">
            Access your emergency fund dashboard
          </p>
        </div>

        {!showEmailForm ? (
          /* Choice Screen */
          <div className="space-y-4">
            {/* Connect Wallet Option */}
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleWalletConnect}
              disabled={loading}
              className="relative overflow-hidden w-full p-6 rounded-[28px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] to-transparent hover:from-emerald-500/[0.12] transition-all duration-300 text-left group disabled:opacity-50"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Wallet size={24} className="text-emerald-500" />
                </div>
                {loading ? (
                  <div className="w-5 h-5 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                ) : (
                  <ArrowRight size={20} className="text-emerald-500 group-hover:translate-x-1 transition-transform" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Connect My XRPL Wallet
              </h3>
              <p className="text-sm text-zinc-400 mb-3">
                For organizations with existing XRPL wallets
              </p>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 w-fit">
                <Zap size={12} className="text-emerald-500" />
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">
                  Instant Access
                </span>
              </div>
            </motion.button>

            {/* Email Login Option */}
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowEmailForm(true)}
              className="relative overflow-hidden w-full p-6 rounded-[28px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 text-left group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                  <Mail size={24} className="text-zinc-400" />
                </div>
                <ArrowRight size={20} className="text-zinc-600 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Sign In with Email
              </h3>
              <p className="text-sm text-zinc-400 mb-3">
                For organizations without crypto wallets
              </p>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] w-fit">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  Custodial Account
                </span>
              </div>
            </motion.button>

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-red-500/[0.05] border border-red-500/20 flex items-start gap-3"
              >
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">
                  {error}
                </p>
              </motion.div>
            )}

            {/* Crossmark Not Installed Warning */}
            {!isCrossmarkInstalled() && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-yellow-500/[0.05] border border-yellow-500/20 flex items-start gap-3"
              >
                <AlertCircle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-400">
                  Crossmark wallet not detected.{' '}
                  <a
                    href="https://crossmark.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-yellow-300 transition-colors"
                  >
                    Install Crossmark
                  </a>
                  {' '}to connect your wallet.
                </p>
              </motion.div>
            )}

            {/* Info Box */}
            <div className="mt-8 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
              <p className="text-xs text-zinc-600 leading-relaxed">
                <strong className="text-zinc-500">Wallet Connection:</strong> Receive funds instantly to your XRPL wallet.
                <br />
                <strong className="text-zinc-500">Email Account:</strong> We manage your wallet and help convert XRP to fiat.
              </p>
            </div>
          </div>
        ) : (
          /* Email Login Form */
          <AnimatePresence mode="wait">
            <motion.form
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleEmailLogin}
              className="space-y-6"
            >
              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                className="text-xs font-bold text-zinc-600 hover:text-white uppercase tracking-widest transition-colors mb-4"
              >
                ← Back to options
              </button>

              {/* Email */}
              <div>
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-widest block mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="org@example.com"
                    className="w-full bg-white/[0.02] border border-white/[0.08] text-white text-sm rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-white/20 transition-colors placeholder:text-zinc-800"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-widest block mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/[0.02] border border-white/[0.08] text-white text-sm rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-white/20 transition-colors placeholder:text-zinc-800"
                    required
                  />
                </div>
              </div>

              {/* Demo Notice */}
              <div className="p-4 rounded-2xl bg-emerald-500/[0.05] border border-emerald-500/10">
                <p className="text-xs text-emerald-400 text-center italic">
                  🎭 Demo Mode: Any email/password works
                </p>
              </div>

              {/* Submit */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading || !email || !password}
                className="w-full py-4 bg-white hover:bg-zinc-100 text-black font-bold text-sm uppercase tracking-[0.2em] rounded-2xl transition-all duration-300 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    Logging in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <LogIn size={16} />
                    Access Dashboard
                  </span>
                )}
              </motion.button>
            </motion.form>
          </AnimatePresence>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-zinc-700">
            Powered by XRPL Escrow Protocol
          </p>
        </div>
      </motion.div>
    </div>
  )
}

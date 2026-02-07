import { useState } from 'react'
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
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-green-900/30 border border-green-700 rounded-lg px-4 py-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-300 text-sm font-mono">
            {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
          </span>
        </div>
        <button
          onClick={onDisconnect}
          className="text-sm text-gray-400 hover:text-white transition"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded-lg transition"
      >
        {loading ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {!isCrossmarkInstalled() && (
        <p className="text-yellow-400 text-xs mt-2">
          Crossmark extension not detected.{' '}
          <a
            href="https://crossmark.io"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Install Crossmark
          </a>
        </p>
      )}
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  )
}

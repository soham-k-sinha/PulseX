import { useState, useCallback } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import WalletConnect from './components/WalletConnect'
import DonorDashboard from './components/DonorDashboard'
import AdminPanel from './components/AdminPanel'
import MosaicView from './components/MosaicView'
import { useWebSocket } from './hooks/useWebSocket'
import type { WalletInfo } from './services/wallet'

const queryClient = new QueryClient()

type Tab = 'donor' | 'admin' | 'mosaic'

function AppContent() {
  const [tab, setTab] = useState<Tab>('donor')
  const [wallet, setWallet] = useState<WalletInfo | null>(null)

  const onWsMessage = useCallback((data: any) => {
    // Can trigger re-renders via query invalidation if needed
    console.log('WS event:', data)
  }, [])

  const { connected } = useWebSocket(onWsMessage)

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">
              Emergency Impact Platform
            </h1>
            <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded">
              XRPL Devnet
            </span>
            {connected && (
              <span className="text-xs bg-green-600/30 text-green-300 px-2 py-0.5 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                Live
              </span>
            )}
          </div>
          <WalletConnect
            wallet={wallet}
            onConnect={setWallet}
            onDisconnect={() => setWallet(null)}
          />
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-800/50 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 flex gap-1">
          {[
            { key: 'donor' as Tab, label: 'Donor Dashboard' },
            { key: 'admin' as Tab, label: 'Admin Panel' },
            { key: 'mosaic' as Tab, label: 'Impact Mosaic' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium transition border-b-2 ${
                tab === t.key
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'donor' && (
          wallet ? (
            <DonorDashboard wallet={wallet} />
          ) : (
            <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
              <h2 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h2>
              <p className="text-gray-400 mb-6">
                Connect your Crossmark wallet to start donating to the emergency pool
              </p>
              <WalletConnect
                wallet={wallet}
                onConnect={setWallet}
                onDisconnect={() => setWallet(null)}
              />
            </div>
          )
        )}
        {tab === 'admin' && <AdminPanel />}
        {tab === 'mosaic' && <MosaicView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-4 mt-8">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center text-xs text-gray-500">
          <span>Built on XRPL | Batched Escrow System</span>
          <a
            href="https://devnet.xrpl.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            XRPL Devnet Explorer
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

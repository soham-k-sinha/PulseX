import { useState, useEffect, useCallback } from 'react'
import { WalletInfo } from '../services/wallet'
import { signTransaction } from '../services/wallet'
import * as api from '../services/api'
import type { Donation, XRPLStatus } from '../types'

const EXPLORER = import.meta.env.VITE_XRPL_EXPLORER_URL || 'https://devnet.xrpl.org'

interface Props {
  wallet: WalletInfo
}

export default function DonorDashboard({ wallet }: Props) {
  const [amount, setAmount] = useState('')
  const [donating, setDonating] = useState(false)
  const [donations, setDonations] = useState<Donation[]>([])
  const [totalDonated, setTotalDonated] = useState(0)
  const [poolBalance, setPoolBalance] = useState(0)
  const [threshold, setThreshold] = useState(100)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [status, xrpl] = await Promise.all([
        api.getDonorStatus(wallet.address),
        api.getXRPLStatus(),
      ])
      setDonations(status.donations || [])
      setTotalDonated(status.total_donated_xrp || 0)
      setPoolBalance(xrpl.accounts?.pool?.balance_xrp || 0)
    } catch {
      // silent
    }
  }, [wallet.address])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [loadData])

  const handleDonate = async () => {
    const xrp = parseFloat(amount)
    if (!xrp || xrp <= 0) {
      setError('Enter a valid amount')
      return
    }

    setDonating(true)
    setError('')
    setMessage('')

    try {
      // 1. Prepare unsigned tx
      const prepared = await api.prepareDonation(wallet.address, xrp)

      // 2. Sign with Crossmark (sign only, no submit)
      const txBlob = await signTransaction(prepared.unsigned_tx)

      // 3. Submit signed tx through our backend
      const result = await api.submitSignedTx(txBlob, wallet.address)

      setMessage(`Donation confirmed! ${xrp} XRP sent to pool.`)
      setAmount('')
      setPoolBalance(result.pool_status?.current_balance_xrp || poolBalance)
      loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDonating(false)
    }
  }

  const statusColor = (status: string) => {
    if (status === 'pending') return 'text-yellow-400'
    if (status === 'locked_in_escrow') return 'text-blue-400'
    return 'text-gray-400'
  }

  const statusLabel = (status: string) => {
    if (status === 'pending') return 'Pending Batch'
    if (status === 'locked_in_escrow') return 'Locked in Escrow'
    return status
  }

  return (
    <div className="space-y-6">
      {/* Pool Status */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Pool Status</h3>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-3xl font-bold text-blue-400">{poolBalance.toFixed(2)} XRP</p>
            <p className="text-gray-400 text-sm">Current pool balance</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Batch threshold</p>
            <p className="text-lg font-semibold text-white">{threshold} XRP</p>
          </div>
        </div>
        <div className="mt-4 bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min((poolBalance / threshold) * 100, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {Math.max(threshold - poolBalance, 0).toFixed(2)} XRP until next batch escrow
        </p>
      </div>

      {/* Donate Form */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Donate to Emergency Pool</h3>
        <div className="flex gap-3">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount in XRP"
            min="1"
            step="1"
            className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleDonate}
            disabled={donating}
            className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg transition whitespace-nowrap"
          >
            {donating ? 'Signing...' : 'Donate'}
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          {[10, 25, 50, 100].map((v) => (
            <button
              key={v}
              onClick={() => setAmount(String(v))}
              className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded transition"
            >
              {v} XRP
            </button>
          ))}
        </div>
        {message && (
          <div className="mt-3 bg-green-900/30 border border-green-700 rounded-lg p-3">
            <p className="text-green-300 text-sm">{message}</p>
          </div>
        )}
        {error && (
          <div className="mt-3 bg-red-900/30 border border-red-700 rounded-lg p-3">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Donation History */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Your Donations</h3>
          <span className="text-sm text-gray-400">
            Total: {totalDonated.toFixed(2)} XRP
          </span>
        </div>
        {donations.length === 0 ? (
          <p className="text-gray-500 text-sm">No donations yet</p>
        ) : (
          <div className="space-y-3">
            {donations.map((d) => (
              <div
                key={d.id}
                className="flex justify-between items-center bg-gray-700/50 rounded-lg p-3"
              >
                <div>
                  <p className="text-white font-medium">{d.amount_xrp} XRP</p>
                  <p className={`text-xs ${statusColor(d.batch_status)}`}>
                    {statusLabel(d.batch_status)}
                    {d.batch_id && ` (${d.batch_id})`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {d.created_at ? new Date(d.created_at).toLocaleTimeString() : ''}
                  </span>
                  <a
                    href={`${EXPLORER}/transactions/${d.payment_tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-xs"
                  >
                    View
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

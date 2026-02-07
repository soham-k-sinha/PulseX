import { useState, useEffect } from 'react'
import * as api from '../services/api'
import type { DisasterInfo, XRPLStatus, Organization } from '../types'

const EXPLORER = import.meta.env.VITE_XRPL_EXPLORER_URL || 'https://devnet.xrpl.org'

export default function AdminPanel() {
  const [xrplStatus, setXrplStatus] = useState<XRPLStatus | null>(null)
  const [disasters, setDisasters] = useState<DisasterInfo[]>([])
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Form
  const [disasterType, setDisasterType] = useState('earthquake')
  const [location, setLocation] = useState('')
  const [severity, setSeverity] = useState(7)
  const [causes, setCauses] = useState<string[]>(['health', 'shelter', 'food'])

  const loadData = async () => {
    try {
      const [xrpl, dis, org] = await Promise.all([
        api.getXRPLStatus(),
        api.getDisasters(),
        api.getOrganizations(),
      ])
      setXrplStatus(xrpl)
      setDisasters(dis.disasters || [])
      setOrgs(org.organizations || [])
    } catch {
      // silent
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [])

  const toggleCause = (c: string) => {
    setCauses((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    )
  }

  const handleTrigger = async () => {
    if (!location.trim()) {
      setError('Enter a location')
      return
    }
    if (causes.length === 0) {
      setError('Select at least one cause')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const result = await api.triggerEmergency({
        disaster_type: disasterType,
        location,
        severity,
        affected_causes: causes,
      })
      setMessage(
        `Emergency allocated! ${result.total_allocated_xrp} XRP to ${result.allocations?.length || 0} orgs`
      )
      setLocation('')
      loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Account Balances */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-sm text-gray-400 mb-1">Pool Balance</p>
          <p className="text-2xl font-bold text-blue-400">
            {xrplStatus?.accounts?.pool?.balance_xrp?.toFixed(2) || '...'} XRP
          </p>
          <a
            href={`${EXPLORER}/accounts/${xrplStatus?.accounts?.pool?.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:underline"
          >
            View on Explorer
          </a>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-sm text-gray-400 mb-1">Reserve Balance</p>
          <p className="text-2xl font-bold text-green-400">
            {xrplStatus?.accounts?.reserve?.balance_xrp?.toFixed(2) || '...'} XRP
          </p>
          <a
            href={`${EXPLORER}/accounts/${xrplStatus?.accounts?.reserve?.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-green-400 hover:underline"
          >
            View on Explorer
          </a>
        </div>
      </div>

      {/* Trigger Emergency */}
      <div className="bg-gray-800 rounded-xl p-6 border border-red-800/50">
        <h3 className="text-lg font-semibold text-red-400 mb-4">Trigger Emergency Allocation</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Disaster Type</label>
            <select
              value={disasterType}
              onChange={(e) => setDisasterType(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2"
            >
              <option value="earthquake">Earthquake</option>
              <option value="flood">Flood</option>
              <option value="hurricane">Hurricane</option>
              <option value="wildfire">Wildfire</option>
              <option value="tsunami">Tsunami</option>
              <option value="drought">Drought</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Nepal"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm text-gray-400 block mb-1">
            Severity: {severity}/10
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="mb-4">
          <label className="text-sm text-gray-400 block mb-2">Affected Causes</label>
          <div className="flex gap-2 flex-wrap">
            {['health', 'shelter', 'food', 'education', 'water'].map((c) => (
              <button
                key={c}
                onClick={() => toggleCause(c)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  causes.includes(c)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleTrigger}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
        >
          {loading ? 'Allocating...' : 'Allocate Funds'}
        </button>

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

      {/* Organizations */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Organizations</h3>
        <div className="space-y-2">
          {orgs.map((o) => (
            <div key={o.org_id} className="flex justify-between items-center bg-gray-700/50 rounded-lg p-3">
              <div>
                <p className="text-white font-medium">{o.name}</p>
                <p className="text-xs text-gray-400">
                  {o.cause_type} | Need Score: {o.need_score}/10
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-green-400">{o.total_received_xrp.toFixed(2)} XRP received</p>
                <a
                  href={`${EXPLORER}/accounts/${o.wallet_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline"
                >
                  {o.wallet_address.slice(0, 8)}...
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disaster History */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Disaster History</h3>
        {disasters.length === 0 ? (
          <p className="text-gray-500 text-sm">No emergencies triggered yet</p>
        ) : (
          <div className="space-y-3">
            {disasters.map((d) => (
              <div key={d.disaster_id} className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white font-medium capitalize">
                      {d.disaster_type} - {d.location}
                    </p>
                    <p className="text-xs text-gray-400">
                      Severity: {d.severity}/10 | {d.org_count} orgs | {d.finished_count} finished
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-yellow-400">
                      {d.total_allocated_xrp.toFixed(2)} XRP
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        d.status === 'completed'
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-yellow-900/50 text-yellow-400'
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

// Donations
export const prepareDonation = (donor_address: string, amount_xrp: number) =>
  request<any>('/donations/prepare', {
    method: 'POST',
    body: JSON.stringify({ donor_address, amount_xrp }),
  })

export const submitSignedTx = (tx_blob: string, donor_address: string) =>
  request<any>('/donations/submit', {
    method: 'POST',
    body: JSON.stringify({ tx_blob, donor_address }),
  })

export const confirmDonation = (tx_hash: string, donor_address: string) =>
  request<any>('/donations/confirm', {
    method: 'POST',
    body: JSON.stringify({ tx_hash, donor_address }),
  })

export const getDonorStatus = (address: string) =>
  request<any>(`/donations/status/${address}`)

export const trackDonations = (donor_address: string) =>
  request<any>(`/donations/track/${donor_address}`)

// Batches
export const getBatches = () => request<any>('/batches')
export const getBatchDetail = (batchId: string) => request<any>(`/batches/${batchId}`)

// Emergencies
export const triggerEmergency = (data: {
  disaster_type: string
  location: string
  severity: number
  affected_causes: string[]
}) =>
  request<any>('/emergencies/trigger', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const getDisaster = (disasterId: string) =>
  request<any>(`/emergencies/${disasterId}`)

export const getDisasters = () => request<any>('/emergencies')

// Organizations
export const getOrganizations = () => request<any>('/organizations')

// XRPL
export const getXRPLStatus = () => request<any>('/xrpl/status')

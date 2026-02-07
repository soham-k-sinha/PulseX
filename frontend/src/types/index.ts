export interface Donation {
  id: string
  amount_xrp: number
  payment_tx_hash: string
  batch_id: string | null
  batch_status: string
  created_at: string | null
}

export interface DonorStatus {
  total_donated_xrp: number
  donations: Donation[]
}

export interface BatchEscrow {
  batch_id: string
  total_xrp: number
  donor_count: number
  status: string
  escrow_tx_hash: string
  finish_tx_hash: string | null
  finish_after: number
  trigger_type: string
  created_at: string | null
  finished_at: string | null
}

export interface BatchDetail extends BatchEscrow {
  donors: {
    address: string
    amount_xrp: number
    percentage: number
    payment_tx_hash: string
  }[]
  timeline: {
    created: string | null
    finish_after: number
    finished: string | null
  }
}

export interface Organization {
  org_id: number
  name: string
  cause_type: string
  wallet_address: string
  need_score: number
  total_received_xrp: number
}

export interface OrgEscrowInfo {
  org_id: number
  org_name: string
  amount_xrp: number
  currency?: string
  status: string
  escrow_tx_hash: string
  finish_tx_hash: string | null
  finished_at: string | null
  percentage?: number
  error?: string
}

export interface DisasterInfo {
  disaster_id: string
  disaster_type: string
  location: string
  severity: number
  total_allocated_xrp: number
  total_allocated_rlusd?: number
  status: string
  wallet_address?: string
  org_escrows?: OrgEscrowInfo[]
  org_count?: number
  finished_count?: number
  created_at: string | null
  completed_at?: string | null
}

export interface XRPLStatus {
  network: string
  node_url: string
  accounts: {
    pool: { address: string; balance_xrp: number; balance_drops: number }
    reserve: { address: string; balance_xrp: number; balance_drops: number }
  }
}

export interface PoolStatus {
  current_balance_xrp: number
  threshold_xrp: number
}

export interface WSEvent {
  type: string
  data?: any
}

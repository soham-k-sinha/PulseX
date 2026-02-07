import sdk from '@crossmarkio/sdk'

export interface WalletInfo {
  address: string
  publicKey?: string
}

export function isCrossmarkInstalled(): boolean {
  return typeof window !== 'undefined' && !!window.crossmark
}

export async function connectWallet(): Promise<WalletInfo> {
  if (!isCrossmarkInstalled()) {
    throw new Error(
      'Crossmark wallet extension not found. Please install it from the Chrome Web Store.'
    )
  }

  try {
    const result = await sdk.methods.signInAndWait()
    return {
      address: result.response.data.address,
      publicKey: result.response.data.publicKey,
    }
  } catch (err: any) {
    throw new Error(`Wallet connection failed: ${err.message || err}`)
  }
}

export async function signTransaction(unsignedTx: any): Promise<string> {
  if (!isCrossmarkInstalled()) {
    throw new Error('Crossmark wallet not found')
  }

  try {
    const result = await sdk.methods.signAndWait(unsignedTx)
    const txBlob = result?.response?.data?.txBlob
    if (!txBlob) {
      throw new Error('No signed transaction blob returned')
    }
    return txBlob
  } catch (err: any) {
    throw new Error(`Signing failed: ${err.message || err}`)
  }
}

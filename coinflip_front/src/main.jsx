import React from 'react'
import { createRoot } from 'react-dom/client'
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { getFullnodeUrl } from '@mysten/sui/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'

// Import dApp Kit styles (this is what was missing!)
import '@mysten/dapp-kit/dist/index.css'
import './styles.css'

// Network configuration
const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
})

// React Query client
const queryClient = new QueryClient()

const container = document.getElementById('root')
createRoot(container).render(
  <QueryClientProvider client={queryClient}>
    <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
      <WalletProvider>
        <App />
      </WalletProvider>
    </SuiClientProvider>
  </QueryClientProvider>
)

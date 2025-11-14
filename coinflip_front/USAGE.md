# Using the CoinFlip DApp

Your React frontend is now running at http://localhost:5174 with full Sui SDK integration!

## What's implemented:

1. **Transaction Building**: Each button now creates real `TransactionBlock` objects using the Sui TypeScript SDK
2. **Coin Fetching**: "Get My Coins" button fetches your SUI coins from the blockchain
3. **Contract Calls**: All 4 coinflip functions are wired up:
   - `create_match(coin, bet_amount, choice)`
   - `add_another_player(coin, match, choice)`  
   - `set_winner(match, result)`
   - `pay_winner(match)`

## How to use:

### 1. Setup
- Enter your wallet address (e.g., `0xa56363e98c2e5566c87b4ab9916a709301875d1e2265171c8b3f63c198cd1ac9`)
- Click "Get My Coins" to fetch available SUI coins
- The first coin will be auto-selected

### 2. Create a Match (Player 1)
- Set bet amount (e.g., 100 MIST)
- Choose your side (cara/coroa)
- Click "Create Match" → Transaction will be prepared and logged

### 3. Join Match (Player 2) 
- Get the Match Object ID from Player 1's transaction result
- Use a different wallet/coin
- Click "Join Match" → Adds Player 2 to the game

### 4. Set Winner & Pay
- Enter the Match Object ID
- Click "Set Winner" → Records the coin flip result
- Click "Pay Winner" → Transfers all funds to winner

## Next Steps - Wallet Integration

To actually execute transactions (not just prepare them), you need a wallet adapter:

```bash
npm install @mysten/wallet-kit @mysten/dapp-kit
```

### Example wallet integration:

```tsx
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit'

// In your component:
const account = useCurrentAccount()

// To execute a transaction:
const executeTransaction = async (tx) => {
  if (!account) {
    alert('Please connect wallet first')
    return
  }
  
  try {
    const result = await signAndExecuteTransactionBlock({
      transactionBlock: tx,
      account,
      chain: 'sui:testnet',
    })
    
    log(`Transaction executed: ${result.digest}`)
    return result
  } catch (error) {
    log(`Transaction failed: ${error.message}`)
  }
}
```

## Current Package ID

Your deployed contract: `0xe7d548c9f11426f9c1148d494d02a0e672388ecc9b22876edde157de5f75deb9`

## Testing Commands (CLI alternative)

You can also test via CLI while the dApp is running:

```bash
# Create match
sui client call \
  --package 0xe7d548c9f11426f9c1148d494d02a0e672388ecc9b22876edde157de5f75deb9 \
  --module coinflip \
  --function create_match \
  --args 0xYOUR_COIN_ID 100 true \
  --gas-budget 10000000

# The dApp shows you the exact same transaction structure!
```

The React app is fully functional for building transactions - add wallet signing to complete the integration.
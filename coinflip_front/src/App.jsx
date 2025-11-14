import React, { useState, useEffect } from 'react'
import { 
  ConnectButton, 
  useCurrentAccount, 
  useSignAndExecuteTransaction,
  useSuiClient 
} from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import axios from 'axios'

// Configuration for your deployed coinflip contract
const PACKAGE_ID = '0x2e2a6e4df21c483ae876e35cdde3a31e73091f8941e44a79670efbb312ae5eae'
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
// Escrow address to also check for matches
const ESCROW_ADDRESS = '0x97e4092b163d12fa6d78dba200f9b335e7e559bd61189f080a0565da6f841027'

export default function App(){
  const [bet, setBet] = useState(0.1) // Default bet in SUI
  const [choice, setChoice] = useState(true)
  const [matchId, setMatchId] = useState('')
  const [balance, setBalance] = useState(0) // Total SUI balance
  const [matches, setMatches] = useState([]) // User's matches
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const MIN_BET_SUI = 0.005 // minimum allowed bet in SUI

  // Wallet hooks
  const currentAccount = useCurrentAccount()
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction()
  const suiClient = useSuiClient()

  const log = (s) => {
    console.log(s)
    setLogs(l => [`${new Date().toLocaleTimeString()}: ${s}`, ...l])
  }

  // Auto-fetch balance when wallet connects
  useEffect(() => {
    if (currentAccount) {
      getBalance()
      getMatches()
    }
  }, [currentAccount])

  const executeTransaction = async (tx, actionName) => {
    if (!currentAccount) {
      log('Error: Please connect your wallet first')
      return
    }

    return new Promise((resolve, reject) => {
      signAndExecuteTransaction(
        {
          transaction: tx,
          chain: 'sui:testnet',
        },
        {
          onSuccess: (result) => {
            log(`✅ ${actionName} successful!`)
            log(`Transaction digest: ${result.digest}`)
            const gasUsed = result.effects?.gasUsed?.computationCost || 0
            const gasUsedSui = gasUsed / 1_000_000_000
            log(`Gas used: ${gasUsedSui.toFixed(6)} SUI`)
            
            // Extract created objects for matches
            if (result.effects?.created && actionName === 'Create Match') {
              const createdObjects = result.effects.created
              const matchObject = createdObjects.find(obj => 
                obj.owner && typeof obj.owner === 'object' && 'AddressOwner' in obj.owner
              )
              if (matchObject) {
                log(`📋 Match created with ID: ${matchObject.reference.objectId}`)
                setMatchId(matchObject.reference.objectId)
              }
            }
            
            // Immediately refresh balance for faster feedback
            getBalance()
            
            resolve(result)
          },
          onError: (error) => {
            log(`❌ ${actionName} failed: ${error.message}`)
            console.error('Transaction error:', error)
            reject(error)
          }
        }
      )
    })
  }

  const createMatch = async () => {
    if (!currentAccount) {
      log('Error: Please connect your wallet first')
      return
    }

    // Enforce minimum bet threshold
    if (bet < MIN_BET_SUI) {
      log(`Error: Minimum bet is ${MIN_BET_SUI} SUI. Please increase your bet.`)
      return
    }

    // Convert bet from SUI to MIST for the contract
    const betMist = Math.floor(bet * 1_000_000_000)
    const gasReserveMist = 100_000_000 // 0.1 SUI in MIST
    const requiredMist = betMist + gasReserveMist
    const balanceMist = Math.floor(balance * 1_000_000_000)
    
    if (balanceMist < requiredMist) {
      const requiredSui = requiredMist / 1_000_000_000
      log(`Error: Insufficient balance. You have ${balance} SUI but need ${requiredSui} SUI (${bet} for bet + 0.1 for gas).`)
      return
    }

    setLoading(true)
    try {
      const tx = new Transaction()
      
  // Set gas budget to handle the transaction (in MIST). Reserve ~0.2 SUI.
  // Previously this was too low and caused "insufficient gas" errors.
  tx.setGasBudget(200_000_000) // 0.2 SUI
      
      // Call create_match function - Sui SDK will automatically select coins
      tx.moveCall({
        target: `${PACKAGE_ID}::coinflip::create_match`,
        arguments: [
          tx.splitCoins(tx.gas, [betMist]), // Use gas coin and split the bet amount
          tx.pure.u64(betMist), // bet_amount: u64 in MIST
          tx.pure.bool(choice), // player1_choice: bool
        ],
      })

      await executeTransaction(tx, 'Create Match')
      
      // Refresh balance and matches after transaction - increase delay for chain confirmation
      setTimeout(() => {
        getBalance()
        getMatches()
      }, 5000)
      
    } catch (error) {
      log(`Error creating match: ${error.message}`)
    }
    setLoading(false)
  }

  const joinMatch = async () => {
    if (!currentAccount || !matchId) {
      log('Error: Please connect wallet and provide match ID')
      return
    }

    // Enforce minimum bet threshold
    if (bet < MIN_BET_SUI) {
      log(`Error: Minimum bet is ${MIN_BET_SUI} SUI. Please increase your bet.`)
      return
    }

    // Convert bet from SUI to MIST for the contract
    const betMist = Math.floor(bet * 1_000_000_000)
    const gasReserveMist = 100_000_000 // 0.1 SUI in MIST
    const requiredMist = betMist + gasReserveMist
    const balanceMist = Math.floor(balance * 1_000_000_000)
    
    if (balanceMist < requiredMist) {
      const requiredSui = requiredMist / 1_000_000_000
      log(`Error: Insufficient balance. You have ${balance} SUI but need ${requiredSui} SUI (${bet} for bet + 0.1 for gas).`)
      return
    }

    setLoading(true)
    try {
      // First, fetch the match object to verify it exists and get its details
      let matchObject
      try {
        const objectResponse = await suiClient.getObject({
          id: matchId,
          options: { showContent: true }
        })
        
        if (!objectResponse.data) {
          log(`Error: Match object ${matchId} not found`)
          return
        }
        
        if (!objectResponse.data.content) {
          log(`Error: Match object ${matchId} has no content`)
          return
        }
        
        // Verify this is actually a CoinFlipMatch from the right package
        const expectedType = `${PACKAGE_ID}::coinflip::CoinFlipMatch`
        if (objectResponse.data.content.type !== expectedType) {
          log(`Error: Object type mismatch. Expected: ${expectedType}, Got: ${objectResponse.data.content.type}`)
          log(`❌ This match is from an old contract deployment. Please create a new match using the current frontend.`)
          log(`💡 Current package: ${PACKAGE_ID}`)
          const oldPackage = objectResponse.data.content.type.split('::')[0]
          log(`💡 Old package: ${oldPackage}`)
          return
        }
        
        matchObject = objectResponse.data
        log(`✓ Found valid match object of correct type: ${objectResponse.data.content.type}`)
        
        // Verify the bet amount matches what we're trying to pay
        const currentBetAmount = parseInt(matchObject.content.fields.bet_amount)
        if (currentBetAmount !== betMist) {
          const expectedSui = currentBetAmount / 1_000_000_000
          log(`Error: Bet amount mismatch. Expected ${expectedSui} SUI, but you're betting ${bet} SUI`)
          return
        }
        
        // Check if player2 slot is still available
        if (matchObject.content.fields.player2 !== null) {
          log('Error: This match already has a second player')
          return
        }
        
        log(`📋 Joining match: ID=${matchId}, Bet=${bet} SUI, Choice=${!choice}`)
        log(`✓ Match verified: bet_amount=${currentBetAmount/1_000_000_000} SUI, player2=${matchObject.content.fields.player2}`)
        
      } catch (fetchError) {
        log(`Error fetching match object: ${fetchError.message}`)
        return
      }

      const tx = new Transaction()
      
      // Increase gas budget for joining a match to avoid insufficient gas
      tx.setGasBudget(100_000_000) // 0.1 SUI
      
      // Call add_another_player function
      // Use tx.object for shared objects - the SDK should handle this automatically
      tx.moveCall({
        target: `${PACKAGE_ID}::coinflip::add_another_player`,
        arguments: [
          tx.splitCoins(tx.gas, [betMist]), // Split bet amount from gas coin
          tx.object(matchId), // CoinFlipMatch shared object (mutable reference)
          tx.pure.bool(!choice), // player2_choice: bool (opposite of player1's choice for demo)
        ],
      })

      // Try devInspect first to see if there are any issues before signing
      try {
        const devInspectResult = await suiClient.devInspectTransactionBlock({
          transactionBlock: tx,
          sender: currentAccount.address,
        })
        
        if (devInspectResult.error) {
          log(`DevInspect error: ${devInspectResult.error}`)
          return
        }
        
        log(`✓ DevInspect passed - transaction should work`)
      } catch (devErr) {
        log(`DevInspect failed: ${devErr.message}`)
        log('This might help debug the transaction issue before signing')
      }

      await executeTransaction(tx, 'Join Match')
      
      // Refresh balance and matches after transaction - increase delay for chain confirmation
      setTimeout(() => {
        getBalance()
        getMatches()
      }, 5000)
      
    } catch (error) {
      log(`Error joining match: ${error.message}`)
      if (error.message.includes('CommandArgumentError')) {
        log('💡 Hint: Make sure the match ID is valid and from the current contract deployment')
        log(`💡 Current package: ${PACKAGE_ID}`)
      }
    }
    setLoading(false)
  }

  const setWinner = async () => {
    if (!currentAccount || !matchId) {
      log('Error: Please connect wallet and provide match ID')
      return
    }

    // Use backend escrow service to set winner (server holds escrow private key)
    setLoading(true)
    try {
      const resp = await axios.post(`${BACKEND_URL}/set_winner`, {
        matchId,
        coinResult: choice,
      }, { timeout: 30_000 })

      if (resp.data?.digest) {
        log(`✅ Set winner request submitted by escrow. Transaction digest: ${resp.data.digest}`)
        // Optionally show effects summary
        if (resp.data.effects) {
          log(`Effects: ${JSON.stringify(resp.data.effects).slice(0,200)}...`)
        }
      } else if (resp.data?.transactionBase64) {
        log('⚠️ Backend did not have escrow key; returned serialized transaction for offline signing.')
        log(`Serialized tx (base64): ${resp.data.transactionBase64.slice(0,80)}...`)
      } else if (resp.data?.note) {
        log(`Note from server: ${resp.data.note}`)
      } else {
        log('Server responded but no digest or serialized transaction found. See server logs for details.')
      }

      // Refresh matches/balance after a short delay - increase for chain confirmation
      setTimeout(() => {
        getBalance()
        getMatches()
      }, 5000)

    } catch (error) {
      log(`Error contacting escrow server: ${error?.response?.data?.error || error.message}`)
      console.error('Escrow request error:', error)
    }
    setLoading(false)
  }

  const payWinner = async () => {
    if (!currentAccount || !matchId) {
      log('Error: Please connect wallet and provide match ID')
      return
    }

    setLoading(true)
    try {
      const tx = new Transaction()
      
  // Increase gas budget for pay_winner to ensure the transfer completes
  tx.setGasBudget(100_000_000) // 0.1 SUI
      
      // Call pay_winner function
      tx.moveCall({
        target: `${PACKAGE_ID}::coinflip::pay_winner`,
        arguments: [
          tx.object(matchId), // CoinFlipMatch object (consumed by value)
        ],
      })

      await executeTransaction(tx, 'Pay Winner')
      
      // Refresh balance and matches after transaction - increase delay for chain confirmation
      setTimeout(() => {
        getBalance()
        getMatches()
      }, 5000)
      
    } catch (error) {
      log(`Error paying winner: ${error.message}`)
    }
    setLoading(false)
  }

  const getBalance = async () => {
    if (!currentAccount) {
      log('Error: Please connect your wallet first')
      return
    }

    setLoading(true)
    try {
      const balance = await suiClient.getBalance({
        owner: currentAccount.address,
        coinType: '0x2::sui::SUI',
      })
      
      // Convert from MIST to SUI for display
      const suiBalance = parseInt(balance.totalBalance) / 1_000_000_000
      setBalance(suiBalance)
      
      log(`Current SUI balance: ${suiBalance.toFixed(4)} SUI`)
      
    } catch (error) {
      log(`Error fetching balance: ${error.message}`)
    }
    setLoading(false)
  }

  const getMatches = async () => {
    try {
      // Since all CoinFlipMatch objects are now shared (not owned), we need to
      // query for all objects of this type and then filter for relevant ones
      // Note: This approach may need pagination for large numbers of matches
      
      // First, try to get objects using a more general query
      // We'll look for recent transactions that created CoinFlipMatch objects
      let matchData = []
      
      if (currentAccount) {
        // Get transactions by the current account that might have created matches
        try {
          const txs = await suiClient.queryTransactionBlocks({
            filter: { FromAddress: currentAccount.address },
            options: { showEffects: true, showObjectChanges: true },
            limit: 50 // Look at recent transactions
          })

          // Extract created CoinFlipMatch objects from transaction effects
          for (const txBlock of txs.data) {
            if (txBlock.objectChanges) {
              for (const change of txBlock.objectChanges) {
                if (change.type === 'created' && 
                    change.objectType?.includes('CoinFlipMatch')) {
                  try {
                    // Fetch the actual object details
                    const objResp = await suiClient.getObject({
                      id: change.objectId,
                      options: { showContent: true, showType: true }
                    })
                    
                    if (objResp.data?.content?.fields) {
                      const fields = objResp.data.content.fields
                      const betAmountSui = parseInt(fields.bet_amount) / 1_000_000_000
                      
                      // Determine relationship to current user
                      let relationship = 'other'
                      if (fields.player1 === currentAccount.address) {
                        relationship = 'you-player1'
                      } else if (fields.player2 === currentAccount.address) {
                        relationship = 'you-player2'
                      }
                      
                      matchData.push({
                        id: objResp.data.objectId,
                        player1: fields.player1,
                        player2: fields.player2,
                        betAmount: betAmountSui,
                        player1Choice: fields.player1_choice,
                        player2Choice: fields.player2_choice,
                        result: fields.result,
                        isActive: fields.is_active,
                        owner: relationship
                      })
                    }
                  } catch (fetchErr) {
                    console.warn(`Failed to fetch match object ${change.objectId}:`, fetchErr)
                  }
                }
              }
            }
          }
          
          // Remove duplicates by ID
          const uniqueMatches = new Map()
          matchData.forEach(match => {
            if (!uniqueMatches.has(match.id)) {
              uniqueMatches.set(match.id, match)
            }
          })
          matchData = Array.from(uniqueMatches.values())
          
        } catch (queryErr) {
          console.warn('Failed to query transactions for matches:', queryErr)
          log('Note: Could not fetch match history from transactions')
        }
      }

      setMatches(matchData)
      log(`Found ${matchData.length} matches from transaction history`)

    } catch (error) {
      log(`Error fetching matches: ${error.message}`)
      console.error('Error in getMatches:', error)
    }
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      log(`📋 Copied to clipboard: ${text.slice(0, 20)}...`)
    } catch (error) {
      log(`Error copying to clipboard: ${error.message}`)
    }
  }

  const selectMatch = (matchId) => {
    setMatchId(matchId)
    log(`✅ Selected match: ${matchId}`)
  }

  return (
    <div className="app">
      <header>
        <h1>CoinFlip DApp</h1>
        <p>Live Sui blockchain integration with wallet connectivity</p>
        <p><small>Package ID: {PACKAGE_ID}</small></p>
        <div className="wallet-section">
          <ConnectButton />
          {currentAccount && (
            <div style={{ marginTop: '8px' }}>
              <small>Connected: {currentAccount.address}</small>
              <br />
              <small>Balance: {balance.toFixed(4)} SUI</small>
            </div>
          )}
        </div>
      </header>

      <section className="card">
        <h2>💰 Wallet Balance</h2>
        <div style={{display:'flex', gap:'8px', alignItems:'center', marginTop:'12px'}}>
          <div style={{flex:1, fontSize:'18px', fontWeight:'bold'}}>
            {balance.toFixed(4)} SUI
          </div>
          <button onClick={getBalance} disabled={loading || !currentAccount}>
            {loading ? 'Loading...' : 'Refresh Balance'}
          </button>
        </div>
        <small>Your total SUI balance. Transactions will automatically use available coins.</small>
      </section>

      <section className="card">
        <h2>🎲 Your Matches</h2>
        <div style={{display:'flex', gap:'8px', alignItems:'center', marginBottom:'12px'}}>
          <div style={{flex:1}}>
            {matches.length === 0 ? 'No matches found' : `${matches.length} matches`}
          </div>
          <button onClick={getMatches} disabled={loading || !currentAccount}>
            {loading ? 'Loading...' : 'Refresh Matches'}
          </button>
        </div>
        
        {matches.length > 0 && (
          <div style={{maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px'}}>
            {matches.map((match, i) => (
              <div key={match.id} style={{
                padding: '8px', 
                borderBottom: i < matches.length - 1 ? '1px solid #eee' : 'none',
                fontSize: '14px'
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div>
                    <strong>Match #{i + 1}</strong> - {match.betAmount} SUI
                    {match.owner && (
                      <span style={{
                        marginLeft: '8px',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        backgroundColor: match.owner.startsWith('you') ? '#e8f5e8' : '#fff3cd',
                        color: match.owner.startsWith('you') ? '#155724' : '#856404'
                      }}>
                        {match.owner === 'you-player1' ? 'YOU (P1)' : 
                         match.owner === 'you-player2' ? 'YOU (P2)' : 
                         'SHARED'}
                      </span>
                    )}
                    <br />
                    <small style={{color: match.isActive ? '#28a745' : '#6c757d'}}>
                      {match.isActive ? '🟢 Active' : '⚫ Finished'}
                      {match.player2 ? ' | 2 Players' : ' | Waiting for Player 2'}
                    </small>
                  </div>
                  <div style={{display: 'flex', gap: '4px'}}>
                    <button 
                      onClick={() => selectMatch(match.id)}
                      style={{padding: '4px 8px', fontSize: '12px'}}
                    >
                      Select
                    </button>
                    <button 
                      onClick={() => copyToClipboard(match.id)}
                      style={{padding: '4px 8px', fontSize: '12px'}}
                    >
                      Copy ID
                    </button>
                  </div>
                </div>
                <div style={{fontSize: '11px', color: '#666', marginTop: '4px'}}>
                  ID: {match.id.slice(0, 20)}...
                </div>
              </div>
            ))}
          </div>
        )}
        
        <small>Matches you've created or are participating in. All matches are shared objects. Click "Select" to use a match ID below.</small>
      </section>

      <section className="card">
        <h2>🎮 Create Match (Player 1)</h2>
        <label>Bet Amount (SUI)</label>
        <input 
          type="number" 
          value={bet} 
          onChange={e => setBet(Number(e.target.value))} 
          step="0.001"
          min="0.005"
        />
        <label>Your Choice</label>
        <select value={choice ? 'true' : 'false'} onChange={e => setChoice(e.target.value === 'true')}>
          <option value="true">🪙 Cara (true)</option>
          <option value="false">🎯 Coroa (false)</option>
        </select>
        <div className="actions">
          <button 
            onClick={createMatch} 
            disabled={loading || !currentAccount || balance < bet + 0.1}
            className="primary"
          >
            {loading ? 'Creating...' : 'Create Match'}
          </button>
        </div>
        <small>Creates a new match on-chain. Requires {bet} SUI for bet + ~0.1 SUI for gas.</small>
      </section>

      <section className="card">
        <h2>⚔️ Game Actions</h2>
        <label>Match Object ID</label>
        <div style={{display: 'flex', gap: '4px', alignItems: 'stretch'}}>
          <input 
            value={matchId} 
            onChange={e => setMatchId(e.target.value)} 
            placeholder="0x... (auto-filled after creating match or selecting above)" 
            style={{flex: 1}}
          />
          {matchId && (
            <button 
              onClick={() => copyToClipboard(matchId)}
              style={{padding: '8px 12px'}}
            >
              📋 Copy
            </button>
          )}
        </div>
        <div className="actions">
          <button onClick={joinMatch} disabled={loading || !currentAccount}>
            Join Match
          </button>
          <button onClick={setWinner} disabled={loading || !currentAccount}>
            Set Winner
          </button>
          <button onClick={payWinner} disabled={loading || !currentAccount}>
            Pay Winner
          </button>
        </div>
        <small>
          <strong>Join:</strong> Player 2 enters with {bet} SUI bet amount. 
          <strong>Set Winner:</strong> Anyone can set the coin flip result. 
          <strong>Pay:</strong> Transfers all funds to winner.
        </small>
      </section>

      <section className="card logs">
        <h2>📋 Transaction Logs</h2>
        <div>
          {logs.length === 0 ? <div className="empty">No transactions yet - connect wallet and start playing!</div> : (
            <ul>
              {logs.map((l,i) => <li key={i}>{l}</li>)}
            </ul>
          )}
        </div>
        <button onClick={() => setLogs([])}>Clear Logs</button>
      </section>

      <footer>
        <small>
          <strong>🚀 Fully functional DApp!</strong> This app connects to your Sui wallet and executes real transactions on testnet. 
          Make sure you have testnet SUI tokens to play.
        </small>
      </footer>
    </div>
  )
}

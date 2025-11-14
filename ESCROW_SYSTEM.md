# Coinflip Escrow System

## Overview
The coinflip contract now uses an escrow system with shared objects to enable trustless gameplay between two players.

## How It Works

### 1. Match Creation
- **Player1** calls `create_match(coin, bet_amount, player1_choice, ctx)`
- The match is created as a **shared object** (not owned by player1)
- Player1's bet is stored in the match
- Any excess coins are returned to player1

### 2. Player2 Joining
- **Player2** can directly call `add_another_player(pay, match_obj, player2_choice, ctx)`
- Since the match is a shared object, **no signature from player1 is needed**
- Player2's bet is added to the match pool
- Both players' choices are now stored

### 3. Escrow Determines Winner
- **Only the escrow address** (`0x97e4092b163d12fa6d78dba200f9b335e7e559bd61189f080a0565da6f841027`) can call `set_winner`
- The escrow calls `set_winner(match_obj, coin_result, ctx)` with the actual coin flip result
- The contract immediately pays the full prize pool to the winner
- The match is marked as inactive

## Key Benefits

### For Players
- **Player2 can join independently** - no need for player1 to be online or sign transactions
- **Immediate payout** when escrow determines the winner
- **Transparent on-chain** - all bets and results are verifiable

### Security
- **No manipulation** - players cannot decide the outcome themselves
- **Trusted escrow** - only the designated wallet can determine winners
- **Shared object safety** - Sui's consensus ensures safe concurrent access

## Example Flow

1. **Alice** creates a match: betting 1 SUI on "heads" (true)
2. **Bob** joins the match: betting 1 SUI on "tails" (false) 
3. **Escrow** flips the coin off-chain and calls `set_winner` with the result
4. If result is "heads" (true), Alice wins 2 SUI automatically
5. If result is "tails" (false), Bob wins 2 SUI automatically

## Technical Notes

- Matches are **shared objects** created with `transfer::public_share_object`
- Players interact with matches using shared object references
- The escrow system prevents manipulation while maintaining decentralization
- All transactions are atomic - no risk of partial state or stuck funds
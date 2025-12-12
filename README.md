# 🪙 CoinFlip on SUI Blockchain

A decentralized coinflip betting game built on the SUI blockchain as part of a blockchain development bootcamp.  This project demonstrates core concepts of Move programming, smart contract design, and decentralized application architecture.

## 📚 Bootcamp Project Overview

This project was developed as part of a comprehensive SUI blockchain bootcamp, showcasing practical implementation of: 
- **Move Smart Contracts**: Writing secure and efficient contracts in Move language
- **SUI Framework**:  Utilizing SUI's unique object model and ownership system
- **Escrow Systems**: Implementing trustless gameplay mechanics
- **Full-Stack dApp**: Building a complete decentralized application with frontend and backend

## 🎮 What is CoinFlip?

CoinFlip is a simple yet powerful betting game where two players wager SUI tokens on the outcome of a coin flip. The game uses an escrow system with shared objects to enable trustless gameplay.

### How It Works

1. **Player 1** creates a match by depositing a bet amount and choosing heads (true) or tails (false)
2. **Player 2** joins the match by depositing an equal bet amount and making their choice
3. **Escrow Service** determines the winner by calling the contract with the actual coin flip result
4. **Winner** receives the entire prize pool (both bets) automatically

## 🏗️ Architecture

The project consists of three main components:

### 1. Smart Contract (`/coinflip`)
Move-based smart contract implementing:
- Match creation and management
- Shared object system for trustless gameplay
- Escrow-controlled winner determination
- Automatic prize distribution

### 2. Backend (`/coinflip_back`)
Node.js backend service handling:
- Transaction processing
- Escrow wallet management
- Random number generation for coin flips
- API endpoints for frontend interaction

### 3. Frontend (`/coinflip_front`)
React-based user interface providing:
- Wallet integration
- Match creation and joining
- Real-time game status updates
- Transaction history

## 🔐 Escrow System

The game uses a sophisticated escrow system for fairness and security:

- **Shared Objects**:  Matches are created as shared objects, allowing Player 2 to join independently without Player 1's signature
- **Trustless Gameplay**: Neither player can manipulate the outcome
- **Designated Escrow**: Only the authorized escrow address can determine winners
- **Atomic Transactions**: All operations are atomic, preventing partial states or stuck funds
- **Transparent Results**: All bets and outcomes are verifiable on-chain

### Escrow Address
```
0x97e4092b163d12fa6d78dba200f9b335e7e559bd61189f080a0565da6f841027
```

## 🚀 Quick Start

### Prerequisites
- SUI CLI installed
- Node.js and npm
- SUI wallet with testnet/devnet tokens

### Deploy Smart Contract

```bash
cd coinflip
sui client publish .  --gas-budget 50000000
```

### Run Backend

```bash
cd coinflip_back
npm install
npm start
```

### Run Frontend

```bash
cd coinflip_front
npm install
npm start
```

## 📖 Learning Resources

This bootcamp project covers essential SUI concepts:

### Move Programming
- Resource-oriented programming
- Ownership and borrowing
- Type safety and generics
- Object model understanding

### SUI Specific Features
- Shared objects vs owned objects
- Transaction building
- Gas management
- Object references

### Security Concepts
- Preventing double spending
- Access control mechanisms
- Escrow patterns
- Atomic operations

## 📝 Documentation

- **[ESCROW_SYSTEM.md](./ESCROW_SYSTEM.md)** - Detailed explanation of the escrow mechanism
- **[IMPLEMENTACAO. md](./IMPLEMENTACAO.md)** - Complete implementation guide (Portuguese)
- **[example_calls.md](./example_calls.md)** - Example CLI commands for testing
- **[transaction_calls.md](./transaction_calls. md)** - Transaction reference guide

## 🧪 Testing

Run the test suite: 

```bash
cd coinflip
sui move test
```

Expected output: `Test result: OK. Total tests: 1; passed:  1; failed: 0`

## 💡 Key Features Demonstrated

### Smart Contract Design
- ✅ Modular function architecture
- ✅ State management with Options
- ✅ Coin handling and merging
- ✅ Object lifecycle management

### Security Patterns
- ✅ Input validation
- ✅ Authorization checks
- ✅ Safe coin transfers
- ✅ Reentrancy protection (built-in Move safety)

### Gas Optimization
- ✅ Efficient object storage
- ✅ Minimal state updates
- ✅ Proper object destruction

## 🎯 Bootcamp Learning Outcomes

Through building this project, you'll learn: 

1. **Smart Contract Development**:  Write, test, and deploy Move contracts on SUI
2. **Object Model Mastery**: Understand SUI's unique object-centric approach
3. **DeFi Patterns**: Implement escrow systems and trustless transactions
4. **Full-Stack Integration**: Connect smart contracts with web applications
5. **Security Best Practices**: Build secure and auditable blockchain applications

## 🛠️ Tech Stack

- **Blockchain**: SUI Network
- **Smart Contract**: Move Language
- **Backend**: Node.js / JavaScript
- **Frontend**: React
- **Testing**: SUI Move Test Framework

## 📊 Contract Functions

| Function | Description | Access |
|----------|-------------|--------|
| `create_match` | Creates a new game match | Anyone |
| `add_another_player` | Join an existing match | Anyone |
| `set_winner` | Determine the winner | Escrow only |
| `pay_winner` | Distribute prize to winner | Automatic |

## 🔮 Future Enhancements

Potential improvements for learning:
- Decentralized oracle integration (Chainlink VRF)
- Multi-player tournament system
- NFT rewards for winners
- DAO governance for parameters
- Leaderboard and ranking system

## 📄 License

This is a bootcamp educational project. Feel free to learn from and modify the code.

## 🤝 Contributing

This project is part of a learning journey. Contributions, suggestions, and feedback are welcome!

## 📞 Contact

For questions about this bootcamp project, please open an issue. 

---

**Built with ❤️ as part of the SUI Blockchain Bootcamp**

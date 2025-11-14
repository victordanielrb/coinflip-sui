# CoinFlip Frontend (quick-start)

This is a minimal React + Vite scaffold for the CoinFlip contract.

Quick start:

1. cd into the frontend

```bash
cd coinflip_front
```

2. Install dependencies

```bash
npm install
```

3. Run dev server

```bash
npm run dev
```

4. Open the URL shown by Vite (usually http://localhost:5173)

Next steps to integrate with Sui:

- Add `@mysten/sui.js` and a wallet adapter (e.g. `@mysten/wallet-adapter-react`) to sign and submit transactions from the UI.
- Use the `sui client` examples in the repo to craft equivalent calls using `sui.js` programmatically.

Notes:
- The current UI contains placeholders which log actions to the screen. Replace these with calls to your Sui RPC / wallet.

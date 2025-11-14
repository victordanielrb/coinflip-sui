import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const SUI_RPC_URL = process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443';
const PACKAGE_ID = process.env.PACKAGE_ID || '0x2e2a6e4df21c483ae876e35cdde3a31e73091f8941e44a79670efbb312ae5eae';

const ESCROW_PRIVATE_KEY = process.env.ESCROW_PRIVATE_KEY; // hex-encoded 32-byte secret
if (!ESCROW_PRIVATE_KEY) {
	console.error('Please set ESCROW_PRIVATE_KEY env var (hex-encoded 32-byte secret)');
	// don't exit so the server can still start for testing import/debug
}

app.get('/health', (_req, res) => res.json({ ok: true }));

// POST /set_winner
// Body: { matchId: string, coinResult: boolean }
app.post('/set_winner', async (req, res) => {
	try {
		const { matchId, coinResult } = req.body;
		if (!matchId || typeof coinResult !== 'boolean') {
			return res.status(400).json({ error: 'matchId and coinResult(boolean) are required' });
		}

		// Dynamically import the Sui SDK ESM subpaths so the server can start even
		// if the import fails. This also avoids the "package exports" error seen
		// when requiring the package root.
		let JsonRpcClientModule, TransactionsModule, KeypairModule;
		try {
			JsonRpcClientModule = await import('@mysten/sui/client');
			TransactionsModule = await import('@mysten/sui/transactions');
			KeypairModule = await import('@mysten/sui/keypairs/ed25519');
		} catch (impErr) {
			console.error('Failed to import @mysten/sui ESM subpaths:', impErr);
			return res.status(500).json({ error: 'Sui SDK import failed on server. See server logs for details.' });
		}

		const { SuiClient } = JsonRpcClientModule;
		const { Transaction } = TransactionsModule;
		const { Ed25519Keypair } = KeypairModule;

		// Create provider / client
		const provider = new SuiClient({ url: SUI_RPC_URL });

		// Build the transaction block using the transactions builder
		const tx = new Transaction();
		// Ensure a reasonable gas budget is set so the RPC won't reject for
		// insufficient gas when the server signs/submits the transaction.
		// Use 0.1 SUI (100_000_000 MIST) as a safe default for this call.
		tx.setGasBudget(100_000_000)
		tx.moveCall({
			target: `${PACKAGE_ID}::coinflip::set_winner`,
			arguments: [tx.object(matchId), tx.pure.bool(coinResult)]
		});

		// If escrow key is not provided, return the serialized transaction so
		// the caller can sign & submit it with a real escrow key.
		if (!ESCROW_PRIVATE_KEY) {
			// For modern SDK, we need to build the transaction to get serialized bytes
			const built = await tx.build({ client: provider });
			return res.json({ 
				note: 'ESCROW_PRIVATE_KEY not set on server. Returning serialized transaction for offline signing.', 
				transactionBase64: built
			});
		}

		// If we have a private key, attempt to sign & submit. The modern Sui SDK
		// uses a simpler approach where the SuiClient can sign and execute directly
		// with an Ed25519Keypair instance.
		try {
			let keypair;
			
			// Handle both hex format and suiprivkey1 format
			if (ESCROW_PRIVATE_KEY.startsWith('suiprivkey1')) {
				// Use the SDK's fromSecretKey method which can handle the Bech32 format directly
				keypair = Ed25519Keypair.fromSecretKey(ESCROW_PRIVATE_KEY);
			} else {
				// Legacy hex format
				const secret = Uint8Array.from(Buffer.from(ESCROW_PRIVATE_KEY, 'hex'));
				keypair = Ed25519Keypair.fromSecretKey(secret);
			}

			// Modern SDK approach: use signAndExecuteTransaction directly with keypair
			const result = await provider.signAndExecuteTransaction({
				transaction: tx,
				signer: keypair,
				requestType: 'WaitForLocalExecution'
			});
			
			return res.json({ digest: result.digest, effects: result.effects });
		} catch (signErr) {
			console.error('Signing or submit failed:', signErr);
			return res.status(500).json({ error: 'Signing or submit failed on server. See server logs.' });
		}
	} catch (e) {
		console.error(e);
		return res.status(500).json({ error: e.message || String(e) });
	}
});

app.listen(PORT, () => {
	console.log(`Escrow server listening on http://localhost:${PORT}`);
});


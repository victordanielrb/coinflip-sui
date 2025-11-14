import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import { MIST_PER_SUI } from '@mysten/sui/utils';


export default async function main() {
// replace <YOUR_SUI_ADDRESS> with your actual address, which is in the form 0x123...
const MY_ADDRESS = '0xf03f8a4f9d33179a541d07c02825f76fc9752af7d15a1ac5a697c2b9aa3e0b73';

// create a new SuiClient object pointing to the network you want to use
const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

// Convert MIST to Sui
const balance = (balance:any) => {
	return Number.parseInt(balance.totalBalance) / Number(MIST_PER_SUI);
};

// store the JSON representation for the SUI the address owns before using faucet
const suiBefore = await suiClient.getBalance({
	owner: MY_ADDRESS,
});

await requestSuiFromFaucetV2({
	// use getFaucetHost to make sure you're using correct faucet address
	// you can also just use the address (see Sui TypeScript SDK Quick Start for values)
	host: getFaucetHost('testnet'),
	recipient: MY_ADDRESS,
});

// store the JSON representation for the SUI the address owns after using faucet
const suiAfter = await suiClient.getBalance({
	owner: MY_ADDRESS,
});

// Output result to console.
let log =
	`Balance before faucet: ${balance(suiBefore)} SUI. Balance after: ${balance(
		suiAfter,
	)} SUI. Hello, SUI!`

// call the async main and handle errors so running via ts-node --esm works
main()
	.then((res) => console.log(res))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
const log = await main();
console.log(log);
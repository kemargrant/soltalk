import React, { FC, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    getLedgerWallet,
    getPhantomWallet,
    getSolflareWallet,
    getSolletWallet,
    getTorusWallet,
} from '@solana/wallet-adapter-wallets';
import {
    WalletModalProvider,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

let isConnected = false;

const IsWalletConnected: FC = (props) => {
	const { publicKey,sendTransaction,signTransaction } = useWallet();
	if(publicKey && isConnected === false){
		isConnected = true;
		props.connectWallet(publicKey,useWallet,signTransaction,sendTransaction).catch(console.warn);
	}
	else if(!publicKey && isConnected){
		isConnected = false;
		props.connectWallet(false,false).catch(console.warn);
	}
    return (null);
}

const Wallet: FC = (props) => {
    // Can be set to 'Devnet', 'Testnet', or 'Mainnet-beta'
    let _network = props.defaultNetwork === "api.mainnet-beta" ? "Mainnet" : "Testnet";
    const network = WalletAdapterNetwork[_network];
	//console.log("network:",network,props.defaultNetwork);	
    // You can also provide a custom RPC endpoint
    const endpoint = useMemo(() => clusterApiUrl( network ), [network]);

    // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking --
    // Only the wallets you configure here will be compiled into your application
    const wallets = useMemo(() => [
        getPhantomWallet(),
        getSolflareWallet(),
        getTorusWallet({
            options: { clientId: 'Get a client ID @ https://developer.tor.us' }
        }),
        getLedgerWallet(),
        getSolletWallet({ network }),
    ], [network]);
	
    return (
        <ConnectionProvider endpoint={endpoint} >
            <WalletProvider wallets={wallets}>
                <WalletModalProvider logo="./logo192.png">
                    <WalletMultiButton />
                    <IsWalletConnected {...props} />
                    { window.location.hostname.search("localhost") > 1 && network === "testnet" ? <>testnet</> : null }
                    { window.location.hostname.search("localhost") > 1 && network === "mainnet-beta" ? <>mainnet</>: null }
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

export { Wallet };

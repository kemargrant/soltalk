## Installation
```
git clone https://github.com/kemargrant/soltalk
cd soltalk
npm install
```

## Running
```
cd soltalk
npm run start
```

## Usage
1. Navigate to http://localhost:3000

2. Press "connect wallet" button & connect your sollet wallet to the https://testnet.solana.com endpoint
**Ensure you have sufficient funding in the sollet wallet**.
  
3. On the website click "create chat account" (This will generate a local RSA key pair that will be used to encrypt / decrypt messages)

4. Click Broadcast Presence (you will be prompted to sign and send a transaction which ties your Solana pubic key to your RSA public key) 
**Users connected to http://localhost:3000 will be prompted to add your account as a contact**


5. Send a message:

	- Click on the contact to highlight the contact

	- Type a message into the input box at the bottom of the site

	- Hit enter/Click the send button
	
	- Sign transactions using sollet wallet




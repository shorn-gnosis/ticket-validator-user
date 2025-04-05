import { useState } from 'react';
import { ethers } from 'ethers';
import './App.css';

const NFT_CONTRACT_ADDRESS = '0x9340184741D938453bF66D77d551Cc04Ab2F4925'; // M3trik Lock
const PURCHASE_URL = 'https://app.metri.xyz/transfer/0x1145d7f127c438286cf499CD9e869253266672e1/crc/1';
const SUPPORT_EMAIL = 'support@aboutcircles.com';

// ABI inclusive of how the unlock protocol handles
const ABI = [
  'function getHasValidKey(address) view returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function keyExpirationTimestampFor(address) view returns (uint256)'
];

function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [isValidTicket, setIsValidTicket] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  const checkTicketValidity = async () => {
    setIsLoading(true);
    setIsValidTicket(null);
    setErrorInfo(null);

    if (!walletAddress) {
      setErrorInfo('Please enter a wallet address');
      setIsLoading(false);
      return;
    }

    let normalizedAddress;
    try {
      normalizedAddress = ethers.getAddress(walletAddress);
    } catch (error) {
      setErrorInfo('Invalid wallet address format');
      setIsLoading(false);
      return;
    }

    // console.log("Checking validity for address:", normalizedAddress);

    try {
      // Always use a direct RPC provider - simpler and more reliable
      const provider = new ethers.JsonRpcProvider('https://rpc.gnosischain.com');
      // console.log("Connected to Gnosis Chain");

      const contract = new ethers.Contract(NFT_CONTRACT_ADDRESS, ABI, provider);
      
      // Step 1: Try getHasValidKey
      try {
        // console.log("Calling getHasValidKey...");
        const hasValidKey = await contract.getHasValidKey(normalizedAddress);
        // console.log("getHasValidKey result:", hasValidKey);
        
        setIsValidTicket(hasValidKey);
        
        // If invalid, let's try to find out why
        if (!hasValidKey) {
          // Step 2: Check balance to see if they own a key at all
          try {
            const balance = await contract.balanceOf(normalizedAddress);
            // console.log("balanceOf result:", balance.toString());
            
            if (balance > 0) {
              // Step 3: Check if the key is expired
              try {
                const expiration = await contract.keyExpirationTimestampFor(normalizedAddress);
                const now = Math.floor(Date.now() / 1000); // Current time in seconds
                // console.log("Key expiration timestamp:", expiration.toString());
                // console.log("Current timestamp:", now);
                
                if (expiration < now) {
                  setErrorInfo('Your key has expired');
                } else {
                  setErrorInfo('You own a key but it appears to be invalid');
                }
              } catch (expError: any) {
                console.error("Error checking expiration:", expError);
                setErrorInfo('Error checking key expiration');
              }
            } else {
              setErrorInfo('No key found for this address');
            }
          } catch (balanceError: any) {
            console.error("Error checking balance:", balanceError);
            setErrorInfo('Error checking key ownership');
          }
        }
      } catch (validKeyError: any) {
        console.error("Error in getHasValidKey:", validKeyError);
        
        // Let's try to extract the specific error
        if (validKeyError.message) {
          console.log("Error message:", validKeyError.message);
          
          if (validKeyError.message.includes("call revert exception")) {
            setErrorInfo('Contract call failed - the contract might not support this method');
          } else if (validKeyError.message.includes("network")) {
            setErrorInfo('Network connection error - please try again');
          } else {
            setErrorInfo(`Error: ${validKeyError.message}`);
          }
        }
        
        setIsValidTicket(false);
      }
    } catch (error: any) {
      console.error('General validation error:', error);
      setIsValidTicket(false);
      setErrorInfo(`Error: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = () => {
    window.open(PURCHASE_URL, '_blank');
  };

  return (
    <div className="App">
      <h1>NFT Ticket Checker</h1>

      <input
        type="text"
        placeholder="Enter Wallet Address"
        value={walletAddress}
        onChange={(e) => setWalletAddress(e.target.value)}
        className="wallet-input"
      />

      <div className="button-group">
        <button
          onClick={checkTicketValidity}
          disabled={isLoading || !walletAddress}
          className="validate-button"
        >
          {isLoading ? 'Checking...' : 'Validate Ticket'}
        </button>
        <button
          onClick={() => {
            setWalletAddress('');
            setIsValidTicket(null);
            setErrorInfo(null);
          }}
          disabled={isLoading}
          className="reset-button"
        >
          Reset
        </button>
      </div>

      {isLoading && <p>Checking ticket validity...</p>}
      {errorInfo && <p className="error-message">{errorInfo}</p>}
      {isValidTicket === true && <p className="valid">✅ Valid Ticket!</p>}
      {isValidTicket === false && !errorInfo && (
        <div className="invalid-container">
          <p className="invalid">❌ Invalid Ticket!</p>
          <button onClick={handlePurchase} className="purchase-button">
            Purchase Ticket
          </button>
        </div>
      )}

      <div className="info-box">
        <h3>Contract Information</h3>
        <p>Lock Contract: {NFT_CONTRACT_ADDRESS}</p>
      </div>

      <div className="support-container">
        <p>Need help? <a href={`mailto:${SUPPORT_EMAIL}`}>Contact Support</a></p>
      </div>
    </div>
  );
}

export default App;
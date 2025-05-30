import { useState } from 'react';
import { ethers } from 'ethers';
import './App.css';

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Use environment variables with fallbacks for development/testing
const NFT_CONTRACT_ADDRESS = import.meta.env.VITE_NFT_CONTRACT_ADDRESS || 
  '0x9340184741D938453bF66D77d551Cc04Ab2F4925'; // Fallback address for development
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 
  'support@aboutcircles.com'; // Fallback support email
const PURCHASE_URL = 'https://app.metri.xyz/transfer/0x1145d7f127c438286cf499CD9e869253266672e1/crc/1';

// ABI inclusive of how the unlock protocol handles
const ABI = [
  'function getHasValidKey(address) view returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function keyExpirationTimestampFor(address) view returns (uint256)'
];

// Interface for NFT details (from HEAD version of ticket-validator/src/App.tsx, seems relevant)
interface NFTDetails {
  contractName: string;
  eventName: string;
  keyExpiration?: string; // Added as it was in the other file's HEAD
}

function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [isValidTicket, setIsValidTicket] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nftDetails, setNftDetails] = useState<NFTDetails | null>(null); // From HEAD
  const [showContractInfo, setShowContractInfo] = useState(false); // From HEAD
  const [errorInfo, setErrorInfo] = useState<string | null>(null); // From remote
  
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
      normalizedAddress = ethers.getAddress(walletAddress); // From remote
    } catch (error) {
      setErrorInfo('Invalid wallet address format'); // From remote
      setIsLoading(false);
      return;
    }

    try {
      // Always use a direct RPC provider - simpler and more reliable (from remote)
      const provider = new ethers.JsonRpcProvider('https://rpc.gnosischain.com');
      const contract = new ethers.Contract(NFT_CONTRACT_ADDRESS, ABI, provider); // Using remote's ABI
      
      // Step 1: Try getHasValidKey (from remote)
      try {
        const hasValidKey = await contract.getHasValidKey(normalizedAddress);
        setIsValidTicket(hasValidKey);
        
        if (!hasValidKey) {
          // Step 2: Check balance (from remote)
          try {
            const balance = await contract.balanceOf(normalizedAddress);
            if (balance > 0) {
              // Step 3: Check if the key is expired (from remote)
              try {
                const expiration = await contract.keyExpirationTimestampFor(normalizedAddress);
                const now = Math.floor(Date.now() / 1000);
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
        // If hasValidKey is true, we might want to populate nftDetails here if applicable
        // For now, sticking to remote logic which doesn't explicitly set nftDetails in this path
        if (hasValidKey) {
            // Potentially fetch and set nftDetails if needed, similar to ticket-validator app
            // For now, this part is simplified to match remote's directness
        }

      } catch (validKeyError: any) {
        console.error("Error in getHasValidKey:", validKeyError);
        if (validKeyError.message) {
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

  // Function to handle purchase button click (from remote)
  const handlePurchase = () => {
    window.open(PURCHASE_URL, '_blank');
  };

  // Function to toggle contract info (from HEAD)
  const toggleContractInfo = () => {
    setShowContractInfo(!showContractInfo);
  };

  return (
    <>
    <div className="App">
      <img src="dappcon-25-logo.png" alt="DappCon Logo" className="app-logo" /> 
      <h1>DappCon25 Ticket Checker</h1> 
      
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
            // Also reset nftDetails and showContractInfo if they are part of the display
            setNftDetails(null); 
            setShowContractInfo(false);
          }}
          disabled={isLoading}
          className="reset-button"
        >
          Reset
        </button>
      </div>

      {isLoading && <p>Checking ticket validity...</p>}
      {errorInfo && <p className="error-message">{errorInfo}</p>}
      {isValidTicket === true && <p className="valid">✅ Valid Dappcon25 NFT ticket found!</p>} 
      {isValidTicket === false && !errorInfo && (
        <div className="invalid-container">
          <p className="invalid">❌ No valid ticket found.</p>
          <button onClick={handlePurchase} className="purchase-button">
            Purchase Ticket
          </button>
        </div>
      )}
      
      <div className="support-container">
        <p>Need help? <a href={`mailto:${SUPPORT_EMAIL}`}>Contact Support</a></p>
      </div>
    </div>
    <div className="contract-info-toggle-container">
      <button onClick={toggleContractInfo} className="contract-info-toggle-link">
        {showContractInfo ? 'Hide contract' : 'View contract'}
      </button>
    </div>
    {showContractInfo && (
      <div className="info-box">
        <h3>Contract Information</h3>
        <p>NFT Contract: {NFT_CONTRACT_ADDRESS}</p>
        <p className="env-note">Using {import.meta.env.VITE_NFT_CONTRACT_ADDRESS ? 'custom' : 'default'} contract address</p>
        {nftDetails && ( // Displaying NFTDetails if available (from HEAD)
          <div className="nft-details">
            <h3>NFT Details</h3>
            <p>Contract Name: {nftDetails.contractName}</p>
            <p>Event Name: {nftDetails.eventName}</p>
            {nftDetails.keyExpiration && <p>Key Expires: {nftDetails.keyExpiration}</p>}
          </div>
        )}
      </div>
    )}
  </>
  );
}

export default App;

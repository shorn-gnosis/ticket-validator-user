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

// Interface for NFT details
interface NFTDetails {
  contractName: string;
  eventName: string;
}

function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [isValidTicket, setIsValidTicket] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nftDetails, setNftDetails] = useState<NFTDetails | null>(null);
const [showContractInfo, setShowContractInfo] = useState(false);
  
  // Function to handle validation
  const checkTicketValidity = async () => {
    setIsLoading(true);
    setIsValidTicket(null); // Reset status

    if (!walletAddress) {
        console.error("Wallet address missing");
        setIsValidTicket(false);
        setIsLoading(false);
        return;
    }

    try {
      // Use JsonRpcProvider for read-only operations (no wallet connection needed)
      // This allows testing with any wallet address without connecting
      const provider = window.ethereum 
        ? new ethers.BrowserProvider(window.ethereum)
        : new ethers.JsonRpcProvider("https://rpc.gnosischain.com");
      
      console.log("Using provider:", provider.constructor.name);
      const contract = new ethers.Contract(
        NFT_CONTRACT_ADDRESS,
        [
          "function ownerOf(uint256 tokenId) view returns (address)",
          "function balanceOf(address owner) view returns (uint256)",
          "function name() view returns (string)",
          "function symbol() view returns (string)",
          "function tokenURI(uint256 tokenId) view returns (string)"
        ],
        provider
      );
      // Try to convert the address to checksummed format
      // This will throw an error if the address is invalid
      let checksummedAddress;
      try {
        checksummedAddress = ethers.getAddress(walletAddress);
      } catch (error) {
        console.error("Invalid wallet address format:", error);
        setIsValidTicket(false);
        setIsLoading(false);
        return;
      }

      let isValid = false;
      let contractName = "";
      let eventName = "";
      
      // Try to get contract name
      try {
        contractName = await contract.name();
        console.log(`Contract name: ${contractName}`);
      } catch (nameError) {
        console.error("Error getting contract name:", nameError);
        contractName = "Unlock Protocol NFT";
      }
      
      // Check balance first (like the staff app does)
      try {
        console.log(`Checking balance for ${walletAddress}`);
        // Use the already declared checksummedAddress variable
        const balance = await contract.balanceOf(checksummedAddress);
        console.log(`Balance for ${walletAddress}: ${balance}`);
        isValid = balance > 0n;
        console.log(`Balance check result: ${isValid}`);
        
        if (isValid) {
          // If balance is positive, set default event name
          eventName = "Unlock Event";
        }
      } catch (balanceError) {
        console.error("Error checking balance:", balanceError);
        setIsValidTicket(false);
        setNftDetails(null);
        return;
      }
      
      setIsValidTicket(isValid);
      
      if (isValid) {
        setNftDetails({
          contractName: contractName,
          eventName: eventName
        });
      } else {
        setNftDetails(null);
      }
    } catch (providerError) {
        console.error("Error initializing provider/contract or during owner check:", providerError);
        setIsValidTicket(false);
    } finally {
        setIsLoading(false); // Ensure loading state is always reset
    }
  };

  // Function to handle purchase button click

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
          disabled={isLoading || !walletAddress} // Disable if loading or no address
          className="validate-button"
        >
          {isLoading ? 'Checking...' : 'Validate Ticket'}
        </button>
        <button
          onClick={() => {
            setWalletAddress('');
            setIsValidTicket(null);
            setNftDetails(null);
          }}
          disabled={isLoading || !walletAddress}
          className="reset-button"
        >
          Reset
        </button>
      </div>

      {isLoading && <p>Checking ticket validity...</p>}
      {isValidTicket === true && <p className="valid">Valid Dappcon25 NFT ticket found!</p>}
      {isValidTicket === false && (
        <div className="invalid-container">
          <p className="invalid">No valid ticket found.</p>
        </div>
      )}
      
      <div className="support-container">
        <p>Need help? <a href={`mailto:${SUPPORT_EMAIL}`} className="support-link">Contact Support</a></p>
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
        {nftDetails && (
          <div className="nft-details">
            <h3>NFT Details</h3>
            <p>Contract Name: {nftDetails.contractName}</p>
            <p>Event Name: {nftDetails.eventName}</p>
          </div>
        )}
      </div>
    )}
  </>
  );
}

export default App;

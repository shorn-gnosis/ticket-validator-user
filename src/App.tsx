import { useState } from 'react';
import { ethers } from 'ethers';
import './App.css';

declare global {
  interface Window {
    ethereum?: any;
  }
}

//const NFT_CONTRACT_ADDRESS = '0xa53A5773b9d4cE2cf5b42A7711239833b31ffc38'; // dappcon test
const NFT_CONTRACT_ADDRESS = '0x9340184741D938453bF66D77d551Cc04Ab2F4925'; // my test
const PURCHASE_URL = 'https://app.metri.xyz/transfer/0x1145d7f127c438286cf499CD9e869253266672e1/crc/1';
const SUPPORT_EMAIL = 'support@aboutcircles.com';

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
      // Validate the address format before making the call
      if (!ethers.isAddress(walletAddress)) {
          console.error("Invalid wallet address format");
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
        const balance = await contract.balanceOf(walletAddress);
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
      {isValidTicket === true && <p className="valid">Valid Ticket!</p>}
      {isValidTicket === false && (
        <div className="invalid-container">
          <p className="invalid">Invalid Ticket!</p>
          <button onClick={handlePurchase} className="purchase-button">
            Purchase Ticket
          </button>
        </div>
      )}
      
      <div className="info-box">
        <h3>Contract Information</h3>
        <p>NFT Contract: {NFT_CONTRACT_ADDRESS}</p>
        
        {nftDetails && (
          <div className="nft-details">
            <h3>NFT Details</h3>
            <p>Contract Name: {nftDetails.contractName}</p>
            <p>Event Name: {nftDetails.eventName}</p>
          </div>
        )}
      </div>
      
      <div className="support-container">
        <p>Need help? <a href={`mailto:${SUPPORT_EMAIL}`} className="support-link">Contact Support</a></p>
      </div>
    </div>
  );
}

export default App;

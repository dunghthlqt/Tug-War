import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface WalletConnectProps {
  onConnect: (provider: ethers.BrowserProvider, signer: ethers.JsonRpcSigner) => void;
}

const WalletConnect = ({ onConnect }: WalletConnectProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            onConnect(provider, signer);
          }
        }
      } catch (err) {
        console.error('Error checking connection:', err);
        // Don't show error for connection check failures
      }
    };

    checkConnection();
  }, [onConnect]);

  const handleConnect = async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask to use this feature');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      onConnect(provider, signer);
    } catch (err) {
      console.error('Error connecting wallet:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet. Please try again.';
      setError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  if (error) {
    return (
      <div className="text-center">
        <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p>{error}</p>
        </div>
        <button
          onClick={() => setError(null)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className={`
        w-full px-6 py-3 rounded-lg font-semibold text-white text-base md:text-lg
        ${isConnecting
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700'}
      `}
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
};

export default WalletConnect; 
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import BlockchainService from '../services/BlockchainService';
import { getContractConfig, switchToMonadNetwork } from '../config/blockchain';

interface StakeManagerProps {
  roomId: string | null;
  isWinner: boolean;
  onStakeSuccess: () => void;
}

const MIN_STAKE = ethers.parseEther('0.01'); // 0.01 MON (native token)

export default function StakeManager({ roomId, isWinner, onStakeSuccess }: StakeManagerProps) {
  const [isStaking, setIsStaking] = useState(false);
  const [hasStaked, setHasStaked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reward, setReward] = useState<bigint>(BigInt(0));
  const [balance, setBalance] = useState<bigint>(BigInt(0));
  const [isInitialized, setIsInitialized] = useState(false);

  const blockchainService = BlockchainService.getInstance();

  useEffect(() => {
    const initializeBlockchain = async () => {
      try {
        if (!blockchainService.isReady()) {
          const config = getContractConfig();
          await blockchainService.initialize(config);
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize blockchain:', error);
        setError('Failed to connect to blockchain. Please check your wallet.');
      }
    };

    initializeBlockchain();
  }, []);

  useEffect(() => {
    const checkStakeStatus = async () => {
      if (!roomId || !isInitialized) return;

      try {
        // Switch to Monad network
        await switchToMonadNetwork();

        // Get wallet address
        const address = await blockchainService.connectWallet();

        // Check MON balance
        const monBalance = await blockchainService.getBalance();
        setBalance(monBalance);

        // Check stake status
        const hasPlayerStaked = await blockchainService.hasStaked(roomId, address);
        setHasStaked(hasPlayerStaked);

        // Contract automatically distributes rewards, no need to check/get rewards
        if (hasPlayerStaked && isWinner) {
          console.log('💰 Contract automatically distributes rewards - no manual claiming needed');
          setReward(BigInt(0)); // No manual reward to claim
        }
      } catch (err) {
        console.error('Error checking stake status:', err);
        setError('Failed to check stake status');
      }
    };

    checkStakeStatus();
  }, [roomId, isWinner, isInitialized]);

  const handleStake = async () => {
    if (!roomId || !isInitialized) return;

    setIsStaking(true);
    setError(null);

    try {
      // Switch to Monad network
      await switchToMonadNetwork();

      // Check MON balance first
      const monBalance = await blockchainService.getBalance();
      
      if (monBalance < MIN_STAKE) {
        throw new Error(`Insufficient MON balance. You need at least ${ethers.formatEther(MIN_STAKE)} MON to stake.`);
      }

      // Simply stake to confirm readiness
      console.log('Staking to confirm readiness...');
      await blockchainService.stake(roomId);

      setHasStaked(true);
      onStakeSuccess();
    } catch (err: unknown) {
      console.error('Error staking:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to stake. Please try again.';
      setError(errorMessage);
    } finally {
      setIsStaking(false);
    }
  };

  // Note: Contract automatically distributes rewards, no manual claiming needed

  if (!roomId) return null;

  if (error) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:right-4 md:left-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm md:text-base">
        <p>{error}</p>
      </div>
    );
  }

  if (isWinner) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:right-4 md:left-auto bg-green-100 border border-green-400 text-green-700 px-4 md:px-6 py-4 rounded-lg shadow-lg">
        <p className="text-base md:text-lg font-bold mb-2">🎉 Congratulations!</p>
        <p className="mb-3 text-sm md:text-base">You won! Reward has been automatically sent to your wallet.</p>
        <p className="text-xs md:text-sm text-green-600">Check your wallet for 0.02 MON reward</p>
      </div>
    );
  }

  if (!hasStaked) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:right-4 md:left-auto bg-blue-100 border border-blue-400 text-blue-700 px-4 md:px-6 py-4 rounded-lg shadow-lg max-w-sm md:max-w-md">
        <p className="text-base md:text-lg font-bold mb-2">🎮 Ready to play?</p>
        <p className="mb-3 text-sm md:text-base">Stake {ethers.formatEther(MIN_STAKE)} MON to join</p>
        {balance < MIN_STAKE && (
          <>
            <p className="mb-3 text-red-500 text-xs md:text-sm">
              You need {ethers.formatEther(MIN_STAKE)} MON to stake. Current balance: {ethers.formatEther(balance)} MON
            </p>
            <p className="mb-3 text-xs md:text-sm">
              Get test MON from these faucets:
            </p>
            <div className="space-y-1 md:space-y-2 mb-3">
              <a
                href="https://faucets.chain.link/monad-testnet"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-600 hover:text-blue-800 text-xs md:text-sm"
              >
                • Chainlink Faucet
              </a>
              <a
                href="https://faucet.quicknode.com/monad/testnet"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-600 hover:text-blue-800 text-xs md:text-sm"
              >
                • QuickNode Faucet
              </a>
              <a
                href="https://gas.zip/monad"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-600 hover:text-blue-800 text-xs md:text-sm"
              >
                • Gas.zip Faucet
              </a>
            </div>
          </>
        )}
        <button
          onClick={handleStake}
          disabled={isStaking || balance < MIN_STAKE}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
        >
          {isStaking ? 'Staking...' : 'Stake & Play'}
        </button>
      </div>
    );
  }

  return null;
} 
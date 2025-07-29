import { useState } from 'react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { useStateTogether } from '@multisynq/react-together';
import WalletConnect from './WalletConnect';

interface GameState {
  players: Record<string, { role: string; isReady: boolean }>;
  roomId: string | null;
  isStarted: boolean;
  ropePosition: number; // Center X position
  player1Pulling: boolean;
  player2Pulling: boolean;
  winner: string | null;
  countdown?: number;
  isCountingDown?: boolean;
}

const MONAD_CHAIN_ID = '0x279f'; // Monad Testnet (10143)
const MIN_STAKE = ethers.parseEther('0.01'); // 0.01 MON

const MONAD_TESTNET_PARAMS = {
  chainId: MONAD_CHAIN_ID,
  chainName: 'Monad Testnet',
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: ['https://testnet-rpc.monad.xyz'],
  blockExplorerUrls: ['https://testnet.monadexplorer.com'],
};

const GameLobby = () => {
  const navigate = useNavigate();
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Use a temporary state key for lobby operations
  const [gameState, setGameState] = useStateTogether<GameState>('lobby_state', {
    players: {},
    roomId: null,
    isStarted: false,
    ropePosition: 600, // Center X position
    player1Pulling: false,
    player2Pulling: false,
    winner: null,
    countdown: undefined,
    isCountingDown: false
  });

  const handleConnect = async (provider: ethers.BrowserProvider, signer: ethers.JsonRpcSigner) => {
    try {
      const network = await provider.getNetwork();
      if (network.chainId.toString(16) !== MONAD_CHAIN_ID.slice(2)) {
        try {
          await window.ethereum?.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: MONAD_CHAIN_ID }],
          });
        } catch (switchError: unknown) {
          const error = switchError as { code?: number };
          if (error.code === 4902) {
            try {
              await window.ethereum?.request({
                method: 'wallet_addEthereumChain',
                params: [MONAD_TESTNET_PARAMS],
              });
            } catch (addError) {
              console.error('Error adding Monad Testnet:', addError);
              setError('Failed to add Monad Testnet to MetaMask. Please add it manually.');
              return;
            }
          } else {
            console.error('Error switching to Monad Testnet:', switchError);
            setError('Failed to switch to Monad Testnet. Please switch manually.');
            return;
          }
        }
      }

      setProvider(provider);
      setSigner(signer);
    } catch (err) {
      console.error('Error connecting to Monad:', err);
      const errorMessage = err instanceof Error ? err.message : 'Please switch to Monad Testnet';
      setError(errorMessage);
    }
  };

  const createGame = async () => {
    if (!provider || !signer) {
      setError('Please connect your wallet first');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const address = await signer.getAddress();
      const newRoomId = ethers.hexlify(ethers.randomBytes(32));

      // Update shared state
      setGameState({
        ...gameState,
        roomId: newRoomId,
        players: {
          ...gameState.players,
          [address]: { role: 'player1', isReady: false }
        },
        isStarted: false,
        ropePosition: 600, // Center X position
        player1Pulling: false,
        player2Pulling: false,
        winner: null
      });

      navigate(`/game/${newRoomId}`);
    } catch (err) {
      console.error('Error creating game:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create game. Please try again.';
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const joinGame = async () => {
    if (!provider || !signer) {
      setError('Please connect your wallet first');
      return;
    }

    if (!roomId) {
      setError('Please enter a room ID');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const address = await signer.getAddress();

      // Update shared state
      setGameState({
        ...gameState,
        players: {
          ...gameState.players,
          [address]: { role: 'player2', isReady: false }
        },
        isStarted: false, // Don't start until both players stake
        ropePosition: gameState.ropePosition || 600, // Keep existing position or use center
        player1Pulling: false,
        player2Pulling: false,
        winner: null
      });

      navigate(`/game/${roomId}`);
    } catch (err) {
      console.error('Error joining game:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to join game. Please try again.';
      setError(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      <h2 className="text-3xl font-bold text-center mb-8">🎮 Tug of War</h2>

      {!provider && (
        <div className="text-center mb-8">
          <WalletConnect onConnect={handleConnect} />
        </div>
      )}

      {error && (
        <div className="p-4 mb-6 bg-red-100 border border-red-400 text-red-700 rounded">
          <p>{error}</p>
        </div>
      )}

      {provider && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4 text-black">Create New Game</h3>
            <p className="text-gray-600 mb-4">
              Stake {ethers.formatEther(MIN_STAKE)} MON to create a new game room
            </p>
            <button
              onClick={createGame}
              disabled={isCreating}
              className={`
                w-full px-6 py-3 rounded-lg font-semibold text-white
                ${isCreating
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'}
              `}
            >
              {isCreating ? 'Creating...' : 'Create Game'}
            </button>
          </div>

          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4 text-black">Join Existing Game</h3>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter Room ID"
              className="w-full p-3 mb-4 border rounded focus:ring-2 focus:ring-blue-500 text-black"
            />
            <button
              onClick={joinGame}
              disabled={isJoining || !roomId}
              className={`
                w-full px-6 py-3 rounded-lg font-semibold text-white
                ${isJoining || !roomId
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'}
              `}
            >
              {isJoining ? 'Joining...' : 'Join Game'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameLobby; 
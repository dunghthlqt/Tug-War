import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStateTogether } from '@multisynq/react-together';
import Game from '../components/Game';
import WalletConnect from '../components/WalletConnect';
import StakeManager from '../components/StakeManager';
import GameInstructions from '../components/GameInstructions';
import LoadingScreen from '../components/LoadingScreen';
import { ethers } from 'ethers';

interface GameState {
  players: Record<string, { role: string; isReady: boolean }>;
  roomId: string | null;
  isStarted: boolean;
  ropePosition: number;
  player1Pulling: boolean;
  player2Pulling: boolean;
  winner: string | null;
  gameFinishedOnBlockchain?: boolean;
  showStartButton?: boolean;
  countdown?: number;
  isCountingDown?: boolean;
}

const Home = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');


  // Use room-specific state key
  const stateKey = `gameState_${roomId}`;
  
  // Use Multisynq state
  const [gameState, setGameState] = useStateTogether<GameState>(stateKey, {
    players: {},
    roomId: roomId || null,
    isStarted: false,
    ropePosition: 600,
    player1Pulling: false,
    player2Pulling: false,
    winner: null
  });

  // Ensure gameState is never undefined
  const safeGameState = gameState || {
    players: {},
    roomId: roomId || null,
    isStarted: false,
    ropePosition: 600,
    player1Pulling: false,
    player2Pulling: false,
    winner: null
  };

  // Debug state changes
  useEffect(() => {
    console.log('=== GameState changed ===');
    console.log('Current gameState:', safeGameState);
    console.log('Players count:', Object.keys(safeGameState.players || {}).length);
    console.log('Players:', safeGameState.players);
    console.log('Is started:', safeGameState.isStarted);
    console.log('Room ID:', safeGameState.roomId);
    console.log('State key:', stateKey);
    console.log('=======================');
  }, [safeGameState, stateKey]);

  // Handle player joining when gameState is initialized
  useEffect(() => {
    const handlePlayerJoin = async () => {
      if (!currentAddress || !signer) return;

      console.log('=== handlePlayerJoin effect triggered ===');
      console.log('Current address:', currentAddress);
      console.log('Current gameState:', safeGameState);
      console.log('Current players:', safeGameState.players);

      // Check if player is already in the game
      const playerData = Object.entries(safeGameState.players || {}).find(
        ([addr]) => addr.toLowerCase() === currentAddress.toLowerCase()
      );

      if (playerData) {
        console.log('Player already in game:', currentAddress);
        return;
      }

      // Check if this is a new room or an existing one
      const hasPlayers = Object.keys(safeGameState.players || {}).length > 0;
      
      if (!hasPlayers) {
        // First player joins as player1
        console.log('Auto-joining as player1');
                  setGameState(prevState => ({
            ...prevState,
            players: {
              ...(prevState?.players || {}),
              [currentAddress]: { role: 'player1', isReady: false }
            },
            roomId: roomId || null,
            showStartButton: false,
            countdown: undefined,
            isCountingDown: false,
            gameFinishedOnBlockchain: false // Reset blockchain finish flag for new game
          }));
      } else {
        // Second player joins as player2
        const hasPlayer2 = Object.values(safeGameState.players || {}).some(p => p.role === 'player2');
        
        if (!hasPlayer2) {
          console.log('Auto-joining as player2');
          setGameState(prevState => ({
            ...prevState,
            players: {
              ...(prevState?.players || {}),
              [currentAddress]: { role: 'player2', isReady: false }
            },
            showStartButton: false,
            countdown: undefined,
            isCountingDown: false,
            gameFinishedOnBlockchain: false // Reset blockchain finish flag for new game
          }));
        } else {
          console.log('Room is full, cannot join');
          setError('Room is full');
          setTimeout(() => navigate('/'), 2000);
        }
      }
    };

    // Add a longer delay to ensure state is properly synchronized
    const timeoutId = setTimeout(handlePlayerJoin, 300);
    return () => clearTimeout(timeoutId);
  }, [safeGameState, currentAddress, signer, roomId, setGameState, navigate]);

  const handleConnect = useCallback(async (provider: ethers.BrowserProvider, signer: ethers.JsonRpcSigner) => {
    try {
      setProvider(provider);
      setSigner(signer);

      if (!roomId) {
        setError('Invalid room ID');
        navigate('/');
        return;
      }

      console.log('Connecting wallet and joining game...');

      // Join game
      setError(null);

      try {
        const address = await signer.getAddress();
        setCurrentAddress(address);

          

        // Check if player is already in the game
        const playerData = Object.entries(safeGameState.players || {}).find(
          ([addr]) => addr.toLowerCase() === address.toLowerCase()
        );

        if (playerData) {
          console.log('Player already in game:', address);
          return;
        }

        // Check if this is a new room or an existing one
        const hasPlayers = Object.keys(safeGameState.players || {}).length > 0;
        
        if (!hasPlayers) {
          // First player joins as player1
          console.log('Joining as player1');
          setGameState(prevState => ({
            ...prevState,
            players: {
              ...(prevState?.players || {}),
              [address]: { role: 'player1', isReady: false }
            },
            roomId: roomId || null,
            showStartButton: false,
            countdown: undefined,
            isCountingDown: false,
            gameFinishedOnBlockchain: false // Reset blockchain finish flag for new game
          }));
        } else {
          // Second player joins as player2
          const hasPlayer2 = Object.values(safeGameState.players || {}).some(p => p.role === 'player2');
          
          if (!hasPlayer2) {
            console.log('Joining as player2');
                      setGameState(prevState => ({
            ...prevState,
            players: {
              ...(prevState?.players || {}),
              [address]: { role: 'player2', isReady: false }
            },
            showStartButton: false,
            countdown: undefined,
            isCountingDown: false,
            gameFinishedOnBlockchain: false // Reset blockchain finish flag for new game
          }));
          } else {
            console.log('Room is full');
            setError('Room is full');
            setTimeout(() => navigate('/'), 2000);
          }
        }
      } catch (err) {
        console.error('Error joining game:', err);
        setError('Failed to join game. Please try again.');
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError('Failed to connect wallet. Please try again.');
    }
  }, [safeGameState, navigate, roomId, setGameState]);

  const handleStakeSuccess = useCallback(() => {
    if (currentAddress) {
      console.log('Player staked, marking as ready:', currentAddress);
      
      setGameState(prevState => {
        // Update the specific player's ready status
        const updatedPlayers = {
          ...prevState.players,
          [currentAddress]: {
            ...prevState.players[currentAddress],
            isReady: true
          }
        };

        // Check if all players are ready
        const allReady = Object.values(updatedPlayers).every(p => p.isReady);
        const hasAllPlayers = Object.keys(updatedPlayers).length >= 2;

        console.log('Updated players:', updatedPlayers);
        console.log('All ready:', allReady);
        console.log('Has all players:', hasAllPlayers);
        console.log('Game already started:', prevState.isStarted);

        // Check if current player is player1 (room creator)
        const isPlayer1 = updatedPlayers[currentAddress]?.role === 'player1';

        const newState = {
          ...prevState,
          players: updatedPlayers,
          // Don't auto-start game, show start button instead
          isStarted: prevState.isStarted,
          // Only set showStartButton if not already set and no winner and not counting down (to avoid overriding from useEffect)
          showStartButton: prevState.showStartButton || (allReady && hasAllPlayers && isPlayer1 && !prevState.isStarted && !prevState.winner && !prevState.isCountingDown),
          // Don't reset gameFinishedOnBlockchain when game starts, only when game ends
          gameFinishedOnBlockchain: prevState.gameFinishedOnBlockchain
        };

        console.log('🎮 Game start logic:', {
          allReady,
          hasAllPlayers,
          shouldStart: allReady && hasAllPlayers,
          newIsStarted: newState.isStarted
        });
        console.log('New state:', newState);
        return newState;
      });
    }
  }, [currentAddress, setGameState]);

  // Check and show start button when both players are ready
  useEffect(() => {
    if (!safeGameState.players || !currentAddress) return;

    const players = Object.values(safeGameState.players);
    const allReady = players.every(p => p.isReady);
    const hasAllPlayers = players.length >= 2;
    const isPlayer1 = safeGameState.players[currentAddress]?.role === 'player1';

    console.log('🎮 Start button check:', {
      players: safeGameState.players,
      allReady,
      hasAllPlayers,
      isPlayer1,
      isStarted: safeGameState.isStarted,
      showStartButton: safeGameState.showStartButton,
      currentAddress
    });

    // Show start button for player1 when both players are ready and game hasn't started and no winner and not counting down
    if (allReady && hasAllPlayers && isPlayer1 && !safeGameState.isStarted && !safeGameState.showStartButton && !safeGameState.winner && !safeGameState.isCountingDown) {
      console.log('🎮 Both players ready, showing start button for player1');
      setGameState(prevState => ({
        ...prevState,
        showStartButton: true
      }));
    }
  }, [safeGameState.players, safeGameState.isStarted, safeGameState.showStartButton, safeGameState.winner, safeGameState.isCountingDown, currentAddress, setGameState]);

  // Handle start button click
  const handleStartGame = useCallback(() => {
    console.log('🎮 Start button clicked, beginning countdown...');
    
    setGameState(prevState => ({
      ...prevState,
      showStartButton: false,
      isStarted: false, // Don't start immediately, wait for countdown
      countdown: 3,
      isCountingDown: true
    }));

    // Start countdown
    const countdownInterval = setInterval(() => {
      setGameState(prevState => {
        const newCountdown = (prevState.countdown || 3) - 1;
        
        if (newCountdown <= 0) {
          // Countdown finished, start the game
          console.log('🎮 Countdown finished, starting game!');
          clearInterval(countdownInterval);
          return {
            ...prevState,
            isStarted: true,
            isCountingDown: false,
            countdown: undefined
          };
        } else {
          // Continue countdown
          console.log('🎮 Countdown:', newCountdown);
          return {
            ...prevState,
            countdown: newCountdown
          };
        }
      });
    }, 1000);
  }, [setGameState]);

  // Show wallet connect screen if not connected
  if (!provider || !signer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
              <div className="w-full max-w-md mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">🎮 Tug of War</h1>
        <div className="bg-white p-8 rounded-lg shadow-2xl">
          <h2 className="text-2xl font-bold mb-4 text-center">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6 text-center">
            Connect your wallet to play and stake MON
          </p>
            {error && (
              <div className="p-4 mb-6 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                <p>{error}</p>
              </div>
            )}
            <WalletConnect onConnect={handleConnect} />
            
            {/* Instructions button */}
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowInstructions(true)}
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                📖 View Game Instructions
              </button>
            </div>
            

          </div>
        </div>
      </div>
    );
  }



  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-gray-900 p-8'>
      {/* Header */}
      <div className="w-full max-w-6xl mx-auto mb-8">
        <h1 className='text-5xl font-bold text-white mb-8 animate-bounce text-center'>🏆 Tug of War</h1>
        
        {/* Game controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4">
          <button
            onClick={() => setShowInstructions(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base"
          >
            📖 Instructions
          </button>
          
          {/* Start Game Button - Only for player1 when both players are ready */}
          {safeGameState.showStartButton && currentAddress && safeGameState.players && safeGameState.players[currentAddress]?.role === 'player1' && (
            <button
              onClick={handleStartGame}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm md:text-base font-bold"
            >
              🎮 START GAME
            </button>
          )}
          
          {safeGameState.players && Object.keys(safeGameState.players).length === 1 && (
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <div className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm md:text-base">
                <span className="text-gray-300">Room ID:</span> <span className="font-mono font-bold text-green-400">{roomId}</span>
              </div>
              <button
                onClick={() => {
                  const url = window.location.href;
                  navigator.clipboard.writeText(url);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm md:text-base"
              >
                📋 Copy Link
              </button>
            </div>
          )}
        </div>
        

      </div>

      {/* Game container */}
      <div className="w-full max-w-6xl mx-auto">
        <div className='w-[1200px] h-[800px] bg-black rounded-lg overflow-hidden shadow-2xl mx-auto'>
          <Game roomId={roomId || ''} />
        </div>
      </div>

      {/* Stake manager */}
      <div className="w-full max-w-6xl mx-auto mt-8">
        <StakeManager
          roomId={roomId || null}
          isWinner={currentAddress && safeGameState.players ? safeGameState.winner === safeGameState.players[currentAddress]?.role : false}
          onStakeSuccess={handleStakeSuccess}
        />
      </div>

      {/* Instructions Modal */}
      <GameInstructions 
        isVisible={showInstructions} 
        onClose={() => setShowInstructions(false)} 
      />

      {/* Loading Screen */}
      <LoadingScreen 
        isVisible={isLoading} 
        message={loadingMessage}
        type="game"
      />
    </div>
  );
};

export default Home;

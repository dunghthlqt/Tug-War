import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Phaser from 'phaser';
import GameScene from '../game/scenes/GameScene';
import { useStateTogether } from '@multisynq/react-together';

interface GameProps {
  roomId: string;
}

export default function Game({ roomId }: GameProps) {
  const gameRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GameScene | null>(null);
  const currentStateRef = useRef<any>(null);
  const lastUpdateRef = useRef<number>(0);
  const isUpdatingRef = useRef<boolean>(false);
  const finishGameCalledRef = useRef<boolean>(false);
  const [gameState, setGameState] = useStateTogether(`gameState_${roomId}`, {
    players: {},
    roomId: roomId || null,
    isStarted: false,
    ropePosition: Math.min(1200, window.innerWidth - 32) / 2, // Dynamic center based on actual screen width
    player1Pulling: false,
    player2Pulling: false,
    winner: null as string | null,
    countdown: undefined as number | undefined,
    isCountingDown: false
  })
  ;
  const [isGameReady, setIsGameReady] = useState(false);

  // Initialize game only once
  useEffect(() => {
    if (!gameRef.current || sceneRef.current) return;

    console.log('Initializing Phaser game...');
    
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 1200,
      height: 800,
      parent: gameRef.current,
      backgroundColor: '#000000',
      scene: GameScene,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false
        }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    const game = new Phaser.Game(config);
    
    // Wait for the scene to be created
    game.events.once('ready', () => {
      const scene = game.scene.getScene('GameScene') as GameScene;
      if (scene) {
        sceneRef.current = scene;
        console.log('Game scene ready');
        setIsGameReady(true);
      }
    });

    return () => {
      console.log('Destroying Phaser game...');
      game.destroy(true);
      sceneRef.current = null;
      setIsGameReady(false);
    };
  }, []);

  // Update game state when it changes
  useEffect(() => {
    if (!sceneRef.current || !isGameReady) return;

    try {
      sceneRef.current.updateGameState(gameState);
    } catch (error) {
      console.error('Error updating game state:', error);
    }
  }, [gameState, isGameReady]);

  // Initialize game state when scene is ready
  useEffect(() => {
    if (!sceneRef.current || !isGameReady) return;

    try {
      sceneRef.current.initGameState(gameState, (updates) => {
        setGameState(prev => ({ ...prev, ...updates }));
      });
    } catch (error) {
      console.error('Error initializing game state:', error);
    }
  }, [gameState, isGameReady, setGameState]);

  // Update current state ref whenever gameState changes
  useEffect(() => {
    console.log('🎮 Updating currentStateRef:', {
      player1Pulling: gameState.player1Pulling,
      player2Pulling: gameState.player2Pulling,
      ropePosition: gameState.ropePosition
    });
    currentStateRef.current = gameState;
  }, [gameState]);

  // Reset rope position to center when component mounts
  useEffect(() => {
    const centerPosition = 600; // Fixed center for 1200px width
    console.log('🎮 Resetting rope position to center:', centerPosition, 'for game width: 1200px');
    setGameState(prev => ({
      ...prev,
      ropePosition: centerPosition
    }));
    
    // Reset finishGame called flag for new game
    finishGameCalledRef.current = false;
  }, [setGameState]);

  // Game loop for rope movement and win conditions
  useEffect(() => {
    if (!gameState.isStarted || gameState.winner) return;

    console.log('🎮 Starting game loop with state:', {
      isStarted: gameState.isStarted,
      player1Pulling: gameState.player1Pulling,
      player2Pulling: gameState.player2Pulling,
      ropePosition: gameState.ropePosition
    });

    const gameLoop = setInterval(() => {
      // Use currentStateRef to get the latest state
      const currentState = currentStateRef.current;
      if (!currentState) return;

      // Use fixed center and max distance for consistent gameplay
      const centerX = 600; // Fixed center for 1200px width
      const maxDistance = 350;
              const pullForce = 10; // Tăng từ 5 lên 10 đơn vị

      let newRopePosition = currentState.ropePosition;

      console.log('🎮 Game loop iteration:', {
        player1Pulling: currentState.player1Pulling,
        player2Pulling: currentState.player2Pulling,
        currentRopePosition: currentState.ropePosition
      });

      // Logic mới: Chỉ kéo 1 lần duy nhất khi playerPulling = true
      let shouldUpdate = false;

      if (currentState.player1Pulling && !currentState.player2Pulling) {
        newRopePosition = Math.max(centerX - maxDistance, newRopePosition - pullForce);
        console.log('🎮 Player1 pulling once, new position:', newRopePosition);
        shouldUpdate = true;
      }
      if (!currentState.player1Pulling && currentState.player2Pulling) {
        newRopePosition = Math.min(centerX + maxDistance, newRopePosition + pullForce);
        console.log('🎮 Player2 pulling once, new position:', newRopePosition);
        shouldUpdate = true;
      }

      // Check win condition (position-based only - timer-based wins are handled in GameScene)
      let winner = null;
      const winDistance = maxDistance * 0.85; // Win threshold at 85% of max distance
      if (newRopePosition <= centerX - winDistance) {
        winner = 'player1';
        console.log('🏆 Player1 wins! Rope position:', newRopePosition, '<=', centerX - winDistance);
      } else if (newRopePosition >= centerX + winDistance) {
        winner = 'player2';
        console.log('🏆 Player2 wins! Rope position:', newRopePosition, '>=', centerX + winDistance);
      }

      if (shouldUpdate || winner) {
        const now = Date.now();
        if (now - lastUpdateRef.current < 50) {
          console.log('🎮 Skipping update - too soon since last update');
          return;
        }

        console.log('🎮 Updating rope position:', {
          from: currentState.ropePosition,
          to: newRopePosition,
          winner,
          player1Pulling: currentState.player1Pulling,
          player2Pulling: currentState.player2Pulling,
          winCondition: winner ? `${winner} wins at position ${newRopePosition}` : 'No winner yet'
        });
        lastUpdateRef.current = now;
        // Update game state first
        setGameState(prevState => {
          const newState = {
            ...prevState,
            ropePosition: newRopePosition,
            winner: winner || prevState.winner,
            isStarted: winner ? false : prevState.isStarted,
            // Reset pulling state sau khi kéo 1 lần
            player1Pulling: false,
            player2Pulling: false,
            // Reset countdown when game ends
            countdown: winner ? undefined : prevState.countdown,
            isCountingDown: winner ? false : prevState.isCountingDown,
            // Don't reset gameFinishedOnBlockchain here to avoid race condition
            gameFinishedOnBlockchain: (prevState as any).gameFinishedOnBlockchain
          };
          
          // Finish game on blockchain if there's a winner (only once and only by player1)
          if (winner && currentState.roomId && !(prevState as any).gameFinishedOnBlockchain && !finishGameCalledRef.current) {
            console.log('🏁 Winner detected, checking finishGame conditions:', {
              winner,
              roomId: currentState.roomId,
              gameFinishedOnBlockchain: (prevState as any).gameFinishedOnBlockchain,
              shouldCallFinishGame: true
            });
            
            // Use async IIFE to handle blockchain call
            (async () => {
              try {
                // Import blockchain service dynamically to avoid circular dependencies
                const { default: BlockchainService } = await import('../services/BlockchainService');
                const blockchainService = BlockchainService.getInstance();
                
                if (blockchainService.isReady()) {
                  // Get current player's address
                  const currentPlayerAddress = await blockchainService.getCurrentAddress();
                  
                  // Get player1's address from game state
                  const player1Data = Object.entries(currentState.players).find(([, data]) => (data as any).role === 'player1');
                  
                  console.log('🏁 Finish game check:', {
                    winner,
                    roomId: currentState.roomId,
                    gameFinishedOnBlockchain: (prevState as any).gameFinishedOnBlockchain,
                    currentPlayerAddress,
                    player1Data: player1Data ? player1Data[0] : null,
                    isPlayer1: player1Data && player1Data[0].toLowerCase() === currentPlayerAddress.toLowerCase()
                  });
                  
                  // Only allow player1 to call finishGame to prevent duplicate transactions
                  if (player1Data && player1Data[0].toLowerCase() === currentPlayerAddress.toLowerCase()) {
                    // Get winner's address from game state
                    const winnerData = Object.entries(currentState.players).find(([, data]) => (data as any).role === winner);
                    if (winnerData) {
                      const winnerAddress = winnerData[0];
                      console.log('🏁 Player1 finishing game on blockchain with winner:', winnerAddress);
                      finishGameCalledRef.current = true; // Mark as called immediately
                      await blockchainService.finishGame(currentState.roomId!, winnerAddress);
                      
                      // Mark as finished to prevent duplicate calls
                      setGameState(prevState => ({
                        ...prevState,
                        gameFinishedOnBlockchain: true
                      }));
                    }
                  } else {
                    console.log('🏁 Skipping finishGame call - only player1 can call this function');
                  }
                }
              } catch (blockchainError) {
                console.error('Failed to finish game on blockchain:', blockchainError);
                // Continue with local game state even if blockchain fails
              }
            })();
          }
          
          return newState;
        });
      }
    }, 50); // Tăng interval từ 16ms lên 50ms để giảm tốc độ update

    return () => {
      console.log('🎮 Stopping game loop');
      clearInterval(gameLoop);
    };
  }, [gameState.isStarted, gameState.winner, gameState.countdown, gameState.isCountingDown, setGameState]);

  // Handle focus
  useEffect(() => {
    const handleFocus = () => {
      // Find the canvas element and focus it
      const canvas = gameRef.current?.querySelector('canvas');
      if (canvas) {
        console.log('Focusing canvas...');
        canvas.focus();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('click', handleFocus);

    // Initial focus
    handleFocus();

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('click', handleFocus);
    };
  }, []);

  return (
    <div 
      id="game-container" 
      ref={gameRef}
      className="w-full h-full min-h-[800px] bg-gray-900"
      tabIndex={-1} // Make div focusable
    />
  );
}; 
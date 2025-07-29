import MockGameContract from '../contracts/MockGameContract';
import { EventEmitter } from '../utils/EventEmitter';

export interface GameState {
  players: Record<string, { role: string; isReady: boolean }>;
  roomId: string | null;
  isStarted: boolean;
  ropePosition: number;
  player1Pulling: boolean;
  player2Pulling: boolean;
  winner: string | null;
}

class GameService extends EventEmitter {
  private static instance: GameService;
  private contract: MockGameContract;
  private gameStates: Map<string, GameState>;

  private constructor() {
    super();
    this.contract = MockGameContract.getInstance();
    this.gameStates = new Map();

    // Listen to contract events
    this.contract.on('Staked', this.handleStaked.bind(this));
    this.contract.on('GameWon', this.handleGameWon.bind(this));
    this.contract.on('RewardClaimed', this.handleRewardClaimed.bind(this));
  }

  public static getInstance(): GameService {
    if (!GameService.instance) {
      GameService.instance = new GameService();
    }
    return GameService.instance;
  }

  public async initializeGame(roomId: string): Promise<GameState> {
    let gameState = this.gameStates.get(roomId);
    
    if (!gameState) {
      console.log('Creating new game state for room:', roomId);
      gameState = {
        players: {},
        roomId,
        isStarted: false,
        ropePosition: window.innerWidth / 2, // Center position
        player1Pulling: false,
        player2Pulling: false,
        winner: null
      };
      this.gameStates.set(roomId, gameState);
    }

    // Load contract state
    const contractState = await this.contract.getGameState(roomId);
    console.log('Loaded contract state:', contractState);
    
    // Update players from contract
    for (const playerAddress of contractState.players) {
      if (!gameState.players[playerAddress]) {
        const role = Object.keys(gameState.players).length === 0 ? 'player1' : 'player2';
        console.log(`Adding player ${playerAddress} as ${role}`);
        gameState.players[playerAddress] = {
          role,
          isReady: true
        };
      }
    }

    // Check if game should start
    const allReady = Object.values(gameState.players).every(p => p.isReady);
    const hasAllPlayers = Object.keys(gameState.players).length === 2;
    if (allReady && hasAllPlayers && !gameState.isStarted) {
      console.log('All players ready, starting game...');
      gameState.isStarted = true;
    }

    console.log('Final game state:', gameState);
    return gameState;
  }

  public async joinGame(roomId: string, playerAddress: string): Promise<void> {
    console.log(`Player ${playerAddress} joining room ${roomId}`);
    const gameState = await this.initializeGame(roomId);
    
    if (!gameState.players[playerAddress]) {
      const role = Object.keys(gameState.players).length === 0 ? 'player1' : 'player2';
      console.log(`Adding new player ${playerAddress} as ${role}`);
      gameState.players[playerAddress] = {
        role,
        isReady: false
      };
    }

    this.emit('gameStateUpdated', roomId, gameState);
  }

  public async stake(roomId: string, playerAddress: string): Promise<void> {
    console.log(`Player ${playerAddress} staking in room ${roomId}`);
    await this.contract.stake(roomId, playerAddress);
    
    const gameState = this.gameStates.get(roomId);
    if (gameState && gameState.players[playerAddress]) {
      console.log(`Marking player ${playerAddress} as ready`);
      gameState.players[playerAddress].isReady = true;

      // Check if game should start
      const allReady = Object.values(gameState.players).every(p => p.isReady);
      const hasAllPlayers = Object.keys(gameState.players).length === 2;
      if (allReady && hasAllPlayers && !gameState.isStarted) {
        console.log('All players ready, starting game...');
        gameState.isStarted = true;
      }

      this.emit('gameStateUpdated', roomId, gameState);
    }
  }

  public async updateGameState(roomId: string, updates: Partial<GameState>): Promise<void> {
    console.log(`Updating game state for room ${roomId}:`, updates);
    const gameState = this.gameStates.get(roomId);
    if (!gameState) {
      console.log('No game state found for room:', roomId);
      return;
    }

    Object.assign(gameState, updates);

    // Check win condition
    if (!gameState.isStarted && gameState.winner) {
      console.log(`Game finished, winner: ${gameState.winner}`);
      await this.contract.finishGame(roomId, gameState.winner);
    }

    this.emit('gameStateUpdated', roomId, gameState);
  }

  public getGameState(roomId: string): GameState | undefined {
    return this.gameStates.get(roomId);
  }

  private handleStaked(event: { roomId: string; player: string }) {
    const gameState = this.gameStates.get(event.roomId);
    if (gameState && gameState.players[event.player]) {
      gameState.players[event.player].isReady = true;
      this.emit('gameStateUpdated', event.roomId, gameState);
    }
  }

  private handleGameWon(event: { roomId: string; winner: string }) {
    const gameState = this.gameStates.get(event.roomId);
    if (gameState) {
      gameState.isStarted = false;
      gameState.winner = event.winner;
      this.emit('gameStateUpdated', event.roomId, gameState);
    }
  }

  private handleRewardClaimed(event: { roomId: string; winner: string }) {
    const gameState = this.gameStates.get(event.roomId);
    if (gameState) {
      // Reset game state
      gameState.winner = null;
      gameState.players = {};
      gameState.isStarted = false;
      gameState.player1Pulling = false;
      gameState.player2Pulling = false;
      gameState.ropePosition = window.innerWidth / 2;
      this.emit('gameStateUpdated', event.roomId, gameState);
    }
  }

  // Helper method to reset state (useful for testing)
  public reset(): void {
    this.gameStates.clear();
    this.contract.reset();
  }
}

export default GameService; 
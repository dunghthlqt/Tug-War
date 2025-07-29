import { EventEmitter } from '../utils/EventEmitter';

class MockGameContract extends EventEmitter {
  private static instance: MockGameContract;
  private gameStates: Map<string, {
    players: Map<string, boolean>, // address -> hasStaked
    isFinished: boolean,
    winner: string | null,
    totalStake: number
  }>;

  private constructor() {
    super();
    this.gameStates = new Map();
  }

  public static getInstance(): MockGameContract {
    if (!MockGameContract.instance) {
      MockGameContract.instance = new MockGameContract();
    }
    return MockGameContract.instance;
  }

  public async stake(roomId: string, playerAddress: string): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    let gameState = this.gameStates.get(roomId);
    if (!gameState) {
      gameState = {
        players: new Map(),
        isFinished: false,
        winner: null,
        totalStake: 0
      };
      this.gameStates.set(roomId, gameState);
    }

    if (gameState.players.has(playerAddress)) {
      throw new Error("Player has already staked");
    }

    gameState.players.set(playerAddress, true);
    gameState.totalStake += 0.01; // 0.01 ETH

    this.emit('Staked', { roomId, player: playerAddress, amount: 0.01 });
  }

  public async finishGame(roomId: string, winner: string): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const gameState = this.gameStates.get(roomId);
    if (!gameState) {
      throw new Error("Game not found");
    }

    if (gameState.isFinished) {
      throw new Error("Game already finished");
    }

    if (!gameState.players.has(winner)) {
      throw new Error("Winner has not staked");
    }

    gameState.isFinished = true;
    gameState.winner = winner;

    this.emit('GameWon', { roomId, winner, prize: gameState.totalStake });
  }

  public async claimReward(roomId: string, playerAddress: string): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const gameState = this.gameStates.get(roomId);
    if (!gameState) {
      throw new Error("Game not found");
    }

    if (!gameState.isFinished) {
      throw new Error("Game not finished");
    }

    if (gameState.winner !== playerAddress) {
      throw new Error("Not the winner");
    }

    const reward = gameState.totalStake;
    gameState.totalStake = 0;

    this.emit('RewardClaimed', { roomId, winner: playerAddress, amount: reward });
  }

  public async hasStaked(roomId: string, playerAddress: string): Promise<boolean> {
    const gameState = this.gameStates.get(roomId);
    if (!gameState) {
      return false;
    }
    return gameState.players.has(playerAddress);
  }

  public async getGameState(roomId: string): Promise<{
    isFinished: boolean;
    winner: string | null;
    totalStake: number;
    players: string[];
  }> {
    const gameState = this.gameStates.get(roomId);
    if (!gameState) {
      return {
        isFinished: false,
        winner: null,
        totalStake: 0,
        players: []
      };
    }

    return {
      isFinished: gameState.isFinished,
      winner: gameState.winner,
      totalStake: gameState.totalStake,
      players: Array.from(gameState.players.keys())
    };
  }

  // Helper method to reset state (useful for testing)
  public reset(): void {
    this.gameStates.clear();
  }
}

export default MockGameContract; 
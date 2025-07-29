import { ethers } from 'ethers';
import { EventEmitter } from '../utils/EventEmitter';
import TugOfWarAutoRewardABI from '../contracts/TugOfWarAutoReward';

export interface GameState {
  players: Record<string, { role: string; isReady: boolean }>;
  roomId: string | null;
  isStarted: boolean;
  ropePosition: number;
  player1Pulling: boolean;
  player2Pulling: boolean;
  winner: string | null;
  gameFinishedOnBlockchain?: boolean;
  countdown?: number;
  isCountingDown?: boolean;
}

export interface ContractConfig {
  tugOfWarAddress: string;
  rpcUrl: string;
  chainId: number;
}

class BlockchainService extends EventEmitter {
  private static instance: BlockchainService;
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private tugOfWarContract: ethers.Contract | null = null;
  private gameStates: Map<string, GameState> = new Map();
  private config: ContractConfig | null = null;
  private isInitialized = false;
  private finishedGames: Set<string> = new Set(); // Track games that have been finished

  private constructor() {
    super();
  }

  public static getInstance(): BlockchainService {
    if (!BlockchainService.instance) {
      BlockchainService.instance = new BlockchainService();
    }
    return BlockchainService.instance;
  }

  public async initialize(config: ContractConfig): Promise<void> {
    try {
      console.log('🔗 Initializing blockchain service...');
      console.log('Config:', config);

      this.config = config;

      // Check if MetaMask is available
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Create provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();

      // Check network
      const network = await this.provider.getNetwork();
      if (network.chainId !== BigInt(config.chainId)) {
        throw new Error(`Wrong network. Expected chainId ${config.chainId}, got ${network.chainId}`);
      }

      // Initialize TugOfWar contract
      this.tugOfWarContract = new ethers.Contract(
        config.tugOfWarAddress,
        TugOfWarAutoRewardABI,
        this.signer
      );

      // Listen for account changes
      (window.ethereum as any).on('accountsChanged', this.handleAccountsChanged.bind(this));
      (window.ethereum as any).on('chainChanged', this.handleChainChanged.bind(this));

      // Listen for contract events
      this.tugOfWarContract.on('GameFinished', this.handleGameFinished.bind(this));
      this.tugOfWarContract.on('PlayerStaked', this.handlePlayerStaked.bind(this));
      this.tugOfWarContract.on('StakeReturned', this.handleStakeReturned.bind(this));

      this.isInitialized = true;
      console.log('✅ Blockchain service initialized successfully');
      
      // Emit initialization event
      this.emit('initialized', { success: true });
    } catch (error) {
      console.error('❌ Failed to initialize blockchain service:', error);
      this.emit('initialized', { success: false, error });
      throw error;
    }
  }

  public async connectWallet(): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const address = await this.signer!.getAddress();
      console.log('🔗 Connected wallet:', address);
      return address;
    } catch (error) {
      console.error('❌ Failed to connect wallet:', error);
      throw error;
    }
  }

  public async getBalance(): Promise<bigint> {
    if (!this.isInitialized || !this.signer) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const address = await this.signer.getAddress();
      const balance = await this.provider!.getBalance(address);
      console.log('💰 MON Balance:', ethers.formatEther(balance), 'MON');
      return balance;
    } catch (error) {
      console.error('❌ Failed to get balance:', error);
      throw error;
    }
  }

  public async getCurrentAddress(): Promise<string> {
    if (!this.isInitialized || !this.signer) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const address = await this.signer.getAddress();
      return address;
    } catch (error) {
      console.error('❌ Failed to get current address:', error);
      throw error;
    }
  }

  public async stake(roomId: string): Promise<void> {
    if (!this.isInitialized || !this.tugOfWarContract) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const playerAddress = await this.signer!.getAddress();
      console.log(`🎯 Staking for room ${roomId} with address ${playerAddress}`);

      // Check if already staked
      const hasStaked = await this.tugOfWarContract.hasStaked(roomId, playerAddress);
      if (hasStaked) {
        throw new Error('Already staked in this room');
      }

      // Reset finished game flag for new game
      this.finishedGames.delete(roomId);

      // Stake amount is 0.01 MON (native token)
      const stakeAmount = ethers.parseEther('0.01');
      
      const tx = await this.tugOfWarContract.stake(roomId, { value: stakeAmount });
      console.log('⏳ Staking transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('✅ Staking transaction confirmed:', receipt.hash);

      // Update local game state
      await this.updateGameStateFromContract(roomId);
      
      // Emit staked event
      this.emit('playerStaked', { roomId, player: playerAddress, amount: stakeAmount });
    } catch (error) {
      console.error('❌ Failed to stake:', error);
      throw error;
    }
  }

  public async claimReward(roomId: string): Promise<void> {
    if (!this.isInitialized || !this.tugOfWarContract) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const playerAddress = await this.signer!.getAddress();
      console.log(`🏆 Claiming reward for room ${roomId} with address ${playerAddress}`);

      const tx = await this.tugOfWarContract.claimReward(roomId);
      console.log('⏳ Claim transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('✅ Claim transaction confirmed:', receipt.hash);

      // Emit reward claimed event
      this.emit('rewardClaimed', { roomId, player: playerAddress });
    } catch (error) {
      console.error('❌ Failed to claim reward:', error);
      throw error;
    }
  }

  public async finishGame(roomId: string, winner: string): Promise<void> {
    if (!this.isInitialized || !this.tugOfWarContract) {
      throw new Error('Blockchain service not initialized');
    }

    // Check if game has already been finished
    if (this.finishedGames.has(roomId)) {
      console.log(`🏁 Game ${roomId} has already been finished, skipping duplicate call`);
      return;
    }

    try {
      console.log(`🏁 Finishing game for room ${roomId} with winner ${winner}`);

      const tx = await this.tugOfWarContract.finishGame(roomId, winner);
      console.log('⏳ Finish game transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('✅ Finish game transaction confirmed:', receipt.hash);

      // Mark game as finished to prevent duplicate calls
      this.finishedGames.add(roomId);

      // Emit game finished event
      this.emit('gameFinished', { roomId, winner });
    } catch (error) {
      console.error('❌ Failed to finish game:', error);
      throw error;
    }
  }

  public async getRoomInfo(roomId: string): Promise<{
    player1: string;
    player2: string;
    totalStake: bigint;
    isActive: boolean;
    gameFinished: boolean;
    winner: string | null;
  }> {
    if (!this.isInitialized || !this.tugOfWarContract) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      // Get room info from contract
      const roomInfo = await this.tugOfWarContract.getRoomInfo(roomId);
      
      return {
        player1: roomInfo.player1,
        player2: roomInfo.player2,
        totalStake: roomInfo.totalStake,
        isActive: roomInfo.isActive,
        gameFinished: roomInfo.gameFinished,
        winner: roomInfo.winner === ethers.ZeroAddress ? null : roomInfo.winner
      };
    } catch (error) {
      console.error('❌ Failed to get room info:', error);
      throw error;
    }
  }

  public async hasStaked(roomId: string, playerAddress: string): Promise<boolean> {
    if (!this.isInitialized || !this.tugOfWarContract) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      return await this.tugOfWarContract.hasStaked(roomId, playerAddress);
    } catch (error) {
      console.error('❌ Failed to check if staked:', error);
      return false;
    }
  }

  // Note: Contract automatically distributes rewards, no need for getReward function
  public async getReward(roomId: string, playerAddress: string): Promise<bigint> {
    // Contract automatically distributes rewards when finishGame is called
    // No separate getReward function needed
    console.log('💰 Contract automatically distributes rewards - no getReward needed');
    return BigInt(0);
  }

  private async updateGameStateFromContract(roomId: string): Promise<void> {
    try {
      const roomInfo = await this.getRoomInfo(roomId);
      let gameState = this.gameStates.get(roomId);
      
      if (!gameState) {
        gameState = {
          players: {},
          roomId,
          isStarted: false,
          ropePosition: 600,
          player1Pulling: false,
          player2Pulling: false,
          winner: null,
          countdown: undefined,
          isCountingDown: false
        };
        this.gameStates.set(roomId, gameState);
      }

      // Update players from room info
      if (roomInfo.player1 !== ethers.ZeroAddress) {
        gameState.players[roomInfo.player1] = { role: 'player1', isReady: true };
      }
      if (roomInfo.player2 !== ethers.ZeroAddress) {
        gameState.players[roomInfo.player2] = { role: 'player2', isReady: true };
      }

      // Update winner if game is finished
      if (roomInfo.gameFinished && roomInfo.winner) {
        gameState.winner = roomInfo.winner;
        gameState.isStarted = false;
        gameState.countdown = undefined;
        gameState.isCountingDown = false;
      }

      this.emit('gameStateUpdated', roomId, gameState);
    } catch (error) {
      console.error('❌ Failed to update game state from contract:', error);
    }
  }

  private handleAccountsChanged(accounts: string[]): void {
    console.log('🔄 Account changed:', accounts);
    if (accounts.length === 0) {
      // User disconnected wallet
      this.emit('walletDisconnected');
    } else {
      // User switched accounts
      this.emit('accountChanged', accounts[0]);
    }
  }

  private handleChainChanged(chainId: string): void {
    console.log('🔄 Chain changed:', chainId);
    const expectedChainId = this.config?.chainId.toString(16);
    if (chainId !== expectedChainId) {
      this.emit('wrongNetwork', { expected: expectedChainId, current: chainId });
    }
  }

  private handleGameFinished(roomId: string, winner: string, prize: bigint): void {
    console.log('🏆 Game finished event:', { roomId, winner, prize });
    this.emit('gameFinished', { roomId, winner, prize });
  }

  private handlePlayerStaked(roomId: string, player: string, stakeAmount: bigint): void {
    console.log('🎯 Player staked event:', { roomId, player, stakeAmount });
    this.emit('playerStaked', { roomId, player, stakeAmount });
  }

  private handleStakeReturned(roomId: string, player: string, amount: bigint): void {
    console.log('💰 Stake returned event:', { roomId, player, amount });
    this.emit('stakeReturned', { roomId, player, amount });
  }

  public getGameStateLocal(roomId: string): GameState | undefined {
    return this.gameStates.get(roomId);
  }

  public updateGameStateLocal(roomId: string, updates: Partial<GameState>): void {
    const gameState = this.gameStates.get(roomId);
    if (gameState) {
      Object.assign(gameState, updates);
      this.emit('gameStateUpdated', roomId, gameState);
    }
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public getConfig(): ContractConfig | null {
    return this.config;
  }
}

export default BlockchainService; 
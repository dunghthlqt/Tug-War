import { Model } from '@multisynq/client';

interface Player {
  role: string;
  isReady: boolean;
}

interface GameState {
  players: Record<string, Player>;
  roomId: string | null;
  ropePosition: number;
  player1Pulling: boolean;
  player2Pulling: boolean;
  isStarted: boolean;
  winner: string | null;
}

export class GameModel extends Model {
  static modelName = 'GameModel';

  // Required static methods for Croquet model
  static create(): Model {
    console.log('GameModel.create() called');
    return new GameModel();
  }

  static defaultViewClass() {
    console.log('GameModel.defaultViewClass() called');
    return null;
  }

  state: GameState = {
    players: {},
    roomId: null,
    ropePosition: window.innerWidth / 2,
    player1Pulling: false,
    player2Pulling: false,
    isStarted: false,
    winner: null
  };

  init() {
    console.log('GameModel.init() called');
    console.log('Initial state:', this.state);
    
    this.subscribe('player', 'join', this.handlePlayerJoin);
    this.subscribe('player', 'ready', this.handlePlayerReady);
    this.subscribe('player', 'pull', this.handlePull);
    this.subscribe('player', 'release', this.handleRelease);
    
    console.log('Subscriptions set up');
    // Tắt GameModel game loop để tránh conflict với Game.tsx game loop
    // this.future(16).updateGame(); // Start game loop at ~60fps
  }

  handlePlayerJoin = ({ address, role, roomId }: { address: string; role: string; roomId: string }) => {
    console.log('=== handlePlayerJoin called ===');
    console.log('Parameters:', { address, role, roomId });
    console.log('Current state before update:', this.state);
    console.log('Current players:', this.state.players);
    
    // Update room ID if not set
    if (!this.state.roomId) {
      console.log('Setting room ID to:', roomId);
      this.state.roomId = roomId;
    }

    // Add player if not exists
    if (!this.state.players[address]) {
      console.log(`Adding new player ${address} as ${role}`);
      this.state.players[address] = {
        role,
        isReady: false
      };
      console.log('Updated players:', this.state.players);
      console.log('Total players now:', Object.keys(this.state.players).length);
      
      // Publish state update
      console.log('Publishing state update...');
      this.publish('game', 'stateUpdated', this.state);
      console.log('State update published');
    } else {
      console.log(`Player ${address} already exists with role:`, this.state.players[address].role);
    }
    
    console.log('=== handlePlayerJoin completed ===');
  };

  handlePlayerReady = ({ address }: { address: string }) => {
    console.log('=== handlePlayerReady called ===');
    console.log('Player address:', address);
    console.log('Current players:', this.state.players);
    
    if (this.state.players[address]) {
      console.log(`Marking player ${address} as ready`);
      this.state.players[address].isReady = true;

      // Check if all players are ready
      const allReady = Object.values(this.state.players).every(p => p.isReady);
      const hasAllPlayers = Object.keys(this.state.players).length === 2;
      
      console.log('All players ready:', allReady);
      console.log('Has all players:', hasAllPlayers);
      console.log('Game already started:', this.state.isStarted);

      if (allReady && hasAllPlayers && !this.state.isStarted) {
        console.log('All conditions met, starting game...');
        this.startGame();
      } else {
        console.log('Not all conditions met, just updating state');
        this.publish('game', 'stateUpdated', this.state);
      }
    } else {
      console.log(`Player ${address} not found in players list`);
    }
    
    console.log('=== handlePlayerReady completed ===');
  };

  handlePull = ({ role }: { role: string }) => {
    console.log('=== handlePull called ===');
    console.log('Role:', role);
    console.log('Current pulling state:', { player1Pulling: this.state.player1Pulling, player2Pulling: this.state.player2Pulling });
    
    if (role === 'player1') {
      console.log('Setting player1Pulling to true');
      this.state.player1Pulling = true;
    } else if (role === 'player2') {
      console.log('Setting player2Pulling to true');
      this.state.player2Pulling = true;
    }
    
    console.log('New pulling state:', { player1Pulling: this.state.player1Pulling, player2Pulling: this.state.player2Pulling });
    this.publish('game', 'stateUpdated', this.state);
    console.log('=== handlePull completed ===');
  };

  handleRelease = ({ role }: { role: string }) => {
    console.log('=== handleRelease called ===');
    console.log('Role:', role);
    console.log('Current pulling state:', { player1Pulling: this.state.player1Pulling, player2Pulling: this.state.player2Pulling });
    
    if (role === 'player1') {
      console.log('Setting player1Pulling to false');
      this.state.player1Pulling = false;
    } else if (role === 'player2') {
      console.log('Setting player2Pulling to false');
      this.state.player2Pulling = false;
    }
    
    console.log('New pulling state:', { player1Pulling: this.state.player1Pulling, player2Pulling: this.state.player2Pulling });
    this.publish('game', 'stateUpdated', this.state);
    console.log('=== handleRelease completed ===');
  };

  updateGame() {
    if (!this.state.isStarted || this.state.winner) {
      this.future(16).updateGame();
      return;
    }

    const pullForce = 2;
    const centerX = window.innerWidth / 2;
    const maxDistance = 350;

    if (this.state.player1Pulling && !this.state.player2Pulling) {
      this.state.ropePosition = Math.max(centerX - maxDistance, this.state.ropePosition - pullForce);
    }
    if (!this.state.player1Pulling && this.state.player2Pulling) {
      this.state.ropePosition = Math.min(centerX + maxDistance, this.state.ropePosition + pullForce);
    }

    // Check win condition
    if (this.state.ropePosition <= centerX - maxDistance) {
      this.state.winner = 'player1';
      this.state.isStarted = false;
      this.publish('game', 'gameOver', { winner: 'player1' });
    } else if (this.state.ropePosition >= centerX + maxDistance) {
      this.state.winner = 'player2';
      this.state.isStarted = false;
      this.publish('game', 'gameOver', { winner: 'player2' });
    }

    this.publish('game', 'stateUpdated', this.state);
    this.future(16).updateGame();
  }

  startGame() {
    console.log('=== startGame called ===');
    console.log('Current state before starting:', this.state);
    
    this.state.isStarted = true;
    this.state.ropePosition = window.innerWidth / 2;
    this.state.player1Pulling = false;
    this.state.player2Pulling = false;
    this.state.winner = null;
    
    console.log('New state after starting:', this.state);
    this.publish('game', 'stateUpdated', this.state);
    console.log('Game started and state published');
    console.log('=== startGame completed ===');
  }
}

export default GameModel; 
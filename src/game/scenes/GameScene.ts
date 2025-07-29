import Phaser from 'phaser';

interface GameState {
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

export default class GameScene extends Phaser.Scene {
  private gameState: GameState | null = null;
  private updateCallback: ((state: Partial<GameState>) => void) | null = null;
  private isInitialized = false;
  private isDestroyed = false;
  private currentPlayerAddress: string | null = null;
  private playerRole: 'player1' | 'player2' | null = null;
  private spaceKey: Phaser.Input.Keyboard.Key | null = null;
  private spaceKeyCreatedAt: number = 0;
  private player1: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null = null;
  private player2: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null = null;
  private rope: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null = null;
  private waitingText: Phaser.GameObjects.Text | null = null;
  private keyText: Phaser.GameObjects.Text | null = null;
  private centerLine: Phaser.GameObjects.Line | null = null;
  private scoreText1: Phaser.GameObjects.Text | null = null;
  private scoreText2: Phaser.GameObjects.Text | null = null;
  private inputInitialized = false;
  private lastSyncTime = 0;
  private syncInterval = 50; // Minimum time between syncs in ms
  private pullCooldown = 0;
  private readonly PULL_COOLDOWN_TIME = 100; // ms
  private readonly PULL_FORCE = 10; // Increased from 5 to 10 units
  private readonly ROPE_BOUNDS_MARGIN = 50;
  private defaultRopePosition = 600;
  private inputSetupCount = 0; // Track how many times setupInput has been called
  private lastInputSetupTime = 0; // Track when setupInput was last called
  private lastStateUpdateTime = 0; // Track last state update time
  private readonly STATE_UPDATE_THROTTLE = 50; // ms between state updates
  private currentPlayer1Pulling = false; // Track current pulling state locally
  private currentPlayer2Pulling = false; // Track current pulling state locally
  private lastWinner: string | null = null; // Track last winner to avoid duplicate win screens

  // Sound effects
  private pullSound: Phaser.Sound.BaseSound | null = null;
  private winSound: Phaser.Sound.BaseSound | null = null;
  private loseSound: Phaser.Sound.BaseSound | null = null;
  private gameStartSound: Phaser.Sound.BaseSound | null = null;
  private soundEnabled = true;

  // Visual effects
  private ropeTension: Phaser.GameObjects.Graphics | null = null;
  private playerParticles: {
    player1: Phaser.GameObjects.Particles.ParticleEmitter | null;
    player2: Phaser.GameObjects.Particles.ParticleEmitter | null;
  } = { player1: null, player2: null };
  private ropeGlow: Phaser.GameObjects.Graphics | null = null;
  private lastRopePosition = 600;
  private ropeVelocity = 0;

  // Game Timer
  private gameTimer: Phaser.GameObjects.Text | null = null;
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private gameTimeRemaining = 60; // 60 seconds countdown
  private readonly GAME_DURATION = 60; // seconds

  constructor() {
    super({ key: 'GameScene' });
    console.log('GameScene constructor called');
  }

  init() {
    console.log('GameScene init called');
    this.isInitialized = false;
    this.inputInitialized = false;
    this.cleanupGameObjects();
  }

  preload() {
    console.log('GameScene preload called');
    
    // Load sound effects
    this.loadSoundEffects();
  }

  create() {
    console.log('GameScene create called');
    
    // Create beautiful background gradient
    this.createBackgroundGradient();
    
    // Create textures
    this.createTextures();
    
    // Initialize space key properly with retry mechanism
    this.initializeSpaceKeyWithRetry();

    // Mark scene as initialized
    this.isInitialized = true;
    console.log('Scene initialized, setting up basic game objects...');
    
    // Always setup basic game objects (players, rope, center line)
    this.setupBasicGameObjects();
    
    // Setup visual effects
    this.setupVisualEffects();
    
    // Setup game timer
    this.setupGameTimer();
    
    // Setup input system
    this.setupInput();
    
    // Check if we have pending game state to setup additional elements
    if (this.gameState) {
      console.log('Found pending game state, updating game state...');
      this.updateGameState(this.gameState);
    }
  }

  initGameState(gameState: GameState, updateCallback: (state: Partial<GameState>) => void) {
    console.log('GameScene initGameState called with state:', gameState);
    if (this.isDestroyed) return;
    
    const isFirstInit = !this.gameState;
    this.gameState = gameState;
    this.updateCallback = updateCallback;

    // Validate and fix rope position if needed
    if (typeof gameState.ropePosition !== 'number' || isNaN(gameState.ropePosition)) {
      gameState.ropePosition = this.defaultRopePosition;
    }

    // Update rope position if it exists
    if (this.rope) {
      this.rope.x = this.clampRopePosition(gameState.ropePosition);
      console.log('Updated rope position from state:', gameState.ropePosition);
    }

    // Update player tints based on pulling state
    if (this.player1) {
      this.player1.setTint(gameState.player1Pulling ? 0xff0000 : 0xffffff);
    }
    if (this.player2) {
      this.player2.setTint(gameState.player2Pulling ? 0xff0000 : 0xffffff);
    }

    if (!this.isInitialized) {
      console.log('Scene not initialized, will setup game when ready');
      return;
    }

    // Only setup game objects on first init
    if (isFirstInit) {
      this.setupGame();
    }

    // Always update player displays
    this.updatePlayerDisplays();
  }

  // Add method to update game state from external changes
  updateGameState(newGameState: GameState) {
    console.log('GameScene updateGameState called:', newGameState);
    console.log('Players in new state:', newGameState.players);
    console.log('Winner in new state:', newGameState.winner);
    console.log('Last winner:', this.lastWinner);
    
    // Check if game just started
    const gameJustStarted = !this.gameState?.isStarted && newGameState.isStarted;
    this.gameState = newGameState;
    
    // Play game start sound if game just started
    if (gameJustStarted && this.soundEnabled && this.gameStartSound) {
      this.gameStartSound.play();
    }
    
    // Start game timer if game just started
    if (gameJustStarted) {
      this.startGameTimer();
    }
    
    // Sync local pulling state with game state
    this.currentPlayer1Pulling = newGameState.player1Pulling;
    this.currentPlayer2Pulling = newGameState.player2Pulling;
    
    // Update rope position if it exists
    if (this.rope && typeof newGameState.ropePosition === 'number') {
      this.rope.x = this.clampRopePosition(newGameState.ropePosition);
      console.log('Updated rope position from state:', newGameState.ropePosition);
    }

    // Update player tints based on pulling state
    if (this.player1) {
      this.player1.setTint(newGameState.player1Pulling ? 0xff0000 : 0xffffff);
    }
    if (this.player2) {
      this.player2.setTint(newGameState.player2Pulling ? 0xff0000 : 0xffffff);
    }
    
    // Update visual effects
    this.updateRopeTension();
    this.updateRopeGlow();
    this.updatePlayerAnimations();
    
    // Check for winner and display win screen
    if (newGameState.winner && newGameState.winner !== this.lastWinner) {
      console.log('🎉 Winner detected:', newGameState.winner);
      console.log('🎉 Calling handleWin with winner:', newGameState.winner);
      this.lastWinner = newGameState.winner;
      this.handleWin(newGameState.winner);
    } else if (newGameState.winner) {
      console.log('🎉 Winner already displayed:', newGameState.winner);
    } else {
      console.log('🎉 No winner yet or winner cleared');
    }
    
    // Re-initialize space key if it's missing and input is available
    if (!this.spaceKey && this.input && this.input.keyboard) {
      console.log('🔧 Re-initializing missing space key...');
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      if (this.spaceKey) {
        this.spaceKey.enabled = true;
        console.log('✅ Space key re-initialized successfully');
      } else {
        console.log('❌ Failed to re-initialize space key');
      }
    } else if (!this.spaceKey) {
      console.log('⚠️ Cannot re-initialize space key - input not ready yet');
    }
    
    // Update player role and address when game state changes
    this.updatePlayerInfo();
    
    // Update player displays
    console.log('🔄 Calling updatePlayerDisplays from updateGameState');
    this.updatePlayerDisplays();
  }

  private async updatePlayerInfo() {
    try {
      if (!window.ethereum) {
        console.log('No ethereum provider found');
        return;
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0].toLowerCase();
      this.currentPlayerAddress = address;
      console.log('Current player address:', this.currentPlayerAddress);
      
      // Find player's role using case-insensitive comparison
      if (this.gameState?.players) {
        const playerData = Object.entries(this.gameState.players).find(
          ([addr]) => addr.toLowerCase() === address
        );
        
        if (playerData) {
          const role = playerData[1].role;
          if (role === 'player1' || role === 'player2') {
            this.playerRole = role;
            console.log('Current player role:', this.playerRole);
          } else {
            console.log('Invalid player role:', role);
            this.playerRole = null;
          }
        } else {
          console.log('Player not found in game state, attempting to assign role...');
          this.assignPlayerRole(address);
        }
      } else {
        console.log('No game state available for role assignment');
      }
    } catch (error) {
      console.error('Error updating player info:', error);
    }
  }

  private assignPlayerRole(address: string): void {
    if (!this.gameState?.players) return;

    const players = Object.entries(this.gameState.players);
    const hasPlayer1 = players.some(([, player]) => player.role === 'player1');
    const hasPlayer2 = players.some(([, player]) => player.role === 'player2');

    if (!hasPlayer1) {
      this.playerRole = 'player1';
      console.log(`✅ Assigned role player1 to ${address}`);
    } else if (!hasPlayer2) {
      this.playerRole = 'player2';
      console.log(`✅ Assigned role player2 to ${address}`);
    } else {
      console.log('❌ Both player roles are already taken');
      this.playerRole = null;
    }
  }

  private createBackgroundGradient() {
    console.log('Creating beautiful background gradient...');
    
    // Create a beautiful gradient background
    const graphics = this.add.graphics();
    
    // Create gradient from dark blue to purple
    graphics.fillGradientStyle(
      0x1a1a2e, // Dark blue
      0x16213e, // Medium blue
      0x0f3460, // Light blue
      0x533483, // Purple
      1
    );
    graphics.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
    
    // Add some subtle stars/particles for atmosphere
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * this.cameras.main.width;
      const y = Math.random() * this.cameras.main.height;
      const size = Math.random() * 2 + 1;
      const alpha = Math.random() * 0.5 + 0.1;
      
      graphics.fillStyle(0xffffff, alpha);
      graphics.fillCircle(x, y, size);
    }
    
    graphics.setDepth(0); // Background layer
  }

  private createTextures() {
    console.log('Creating textures...');
    try {
      // Create player textures with better colors
      const player = this.add.graphics();
      player.clear();
      player.lineStyle(3, 0x4CAF50); // Green border
      player.fillStyle(0x4CAF50); // Green fill
      player.strokeRect(0, 0, 50, 100);
      player.fillRect(0, 0, 50, 100);
      player.generateTexture('player1', 50, 100);
      player.generateTexture('player2', 50, 100);
      player.destroy();

      // Create rope texture - make it look like a real rope
      const rope = this.add.graphics();
      rope.clear();
      
      // Create a more realistic rope appearance
      rope.lineStyle(4, 0x8B4513); // Brown border
      rope.fillStyle(0xD2691E); // Brown fill
      rope.fillRoundedRect(0, 0, 40, 40, 8);
      rope.strokeRoundedRect(0, 0, 40, 40, 8);
      
      // Add rope texture details
      rope.lineStyle(1, 0x654321);
      rope.beginPath();
      rope.moveTo(5, 10);
      rope.lineTo(35, 10);
      rope.moveTo(5, 20);
      rope.lineTo(35, 20);
      rope.moveTo(5, 30);
      rope.lineTo(35, 30);
      rope.strokePath();
      
      rope.generateTexture('rope', 40, 40);
      rope.destroy();

      console.log('Textures created successfully');
    } catch (error) {
      console.error('Error creating textures:', error);
    }
  }

  private loadSoundEffects() {
    console.log('Loading sound effects...');
    
    try {
      // Create simple sound effects using Web Audio API
      this.createPullSound();
      this.createWinSound();
      this.createLoseSound();
      this.createGameStartSound();
      
      console.log('Sound effects loaded successfully');
    } catch (error) {
      console.error('Error loading sound effects:', error);
      this.soundEnabled = false;
    }
  }

  private createPullSound() {
    try {
      // Create a simple "pull" sound effect using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      
      // Store the audio context for reuse
      this.pullSound = {
        play: () => {
          try {
            const newOscillator = audioContext.createOscillator();
            const newGainNode = audioContext.createGain();
            
            newOscillator.connect(newGainNode);
            newGainNode.connect(audioContext.destination);
            
            newOscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            newOscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.1);
            
            newGainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            newGainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            newOscillator.start(audioContext.currentTime);
            newOscillator.stop(audioContext.currentTime + 0.1);
          } catch (error) {
            console.error('Error playing pull sound:', error);
          }
        }
      } as Phaser.Sound.BaseSound;
    } catch (error) {
      console.error('Error creating pull sound:', error);
    }
  }

  private createWinSound() {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.2);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.4);
      
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      this.winSound = {
        play: () => {
          try {
            const newOscillator = audioContext.createOscillator();
            const newGainNode = audioContext.createGain();
            
            newOscillator.connect(newGainNode);
            newGainNode.connect(audioContext.destination);
            
            newOscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            newOscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.2);
            newOscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.4);
            
            newGainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
            newGainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            newOscillator.start(audioContext.currentTime);
            newOscillator.stop(audioContext.currentTime + 0.5);
          } catch (error) {
            console.error('Error playing win sound:', error);
          }
        }
      } as Phaser.Sound.BaseSound;
    } catch (error) {
      console.error('Error creating win sound:', error);
    }
  }

  private createLoseSound() {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.6);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.6);
      
      this.loseSound = {
        play: () => {
          try {
            const newOscillator = audioContext.createOscillator();
            const newGainNode = audioContext.createGain();
            
            newOscillator.connect(newGainNode);
            newGainNode.connect(audioContext.destination);
            
            newOscillator.frequency.setValueAtTime(300, audioContext.currentTime);
            newOscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3);
            newOscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.6);
            
            newGainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            newGainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
            
            newOscillator.start(audioContext.currentTime);
            newOscillator.stop(audioContext.currentTime + 0.6);
          } catch (error) {
            console.error('Error playing lose sound:', error);
          }
        }
      } as Phaser.Sound.BaseSound;
    } catch (error) {
      console.error('Error creating lose sound:', error);
    }
  }

  private createGameStartSound() {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(700, audioContext.currentTime + 0.1);
      oscillator.frequency.exponentialRampToValueAtTime(500, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      this.gameStartSound = {
        play: () => {
          try {
            const newOscillator = audioContext.createOscillator();
            const newGainNode = audioContext.createGain();
            
            newOscillator.connect(newGainNode);
            newGainNode.connect(audioContext.destination);
            
            newOscillator.frequency.setValueAtTime(500, audioContext.currentTime);
            newOscillator.frequency.exponentialRampToValueAtTime(700, audioContext.currentTime + 0.1);
            newOscillator.frequency.exponentialRampToValueAtTime(500, audioContext.currentTime + 0.2);
            
            newGainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            newGainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            newOscillator.start(audioContext.currentTime);
            newOscillator.stop(audioContext.currentTime + 0.3);
          } catch (error) {
            console.error('Error playing game start sound:', error);
          }
        }
      } as Phaser.Sound.BaseSound;
    } catch (error) {
      console.error('Error creating game start sound:', error);
    }
  }

  // Visual Effects Methods
  private setupVisualEffects() {
    console.log('Setting up visual effects...');
    
    try {
      this.setupRopeTension();
      this.setupPlayerParticles();
      this.setupRopeGlow();
      
      console.log('Visual effects setup completed');
    } catch (error) {
      console.error('Error setting up visual effects:', error);
    }
  }

  private setupRopeTension() {
    try {
      // Create rope tension visualization
      this.ropeTension = this.add.graphics();
      this.ropeTension.setDepth(1);
    } catch (error) {
      console.error('Error setting up rope tension:', error);
    }
  }

  private setupPlayerParticles() {
    try {
      // Create particle effects for players
      if (this.player1) {
        this.playerParticles.player1 = this.add.particles(this.player1.x, this.player1.y, 'rope', {
          speed: { min: 50, max: 100 },
          scale: { start: 0.5, end: 0 },
          lifespan: 500,
          frequency: 100,
          blendMode: 'ADD',
          tint: 0x0066ff
        });
      }
      
      if (this.player2) {
        this.playerParticles.player2 = this.add.particles(this.player2.x, this.player2.y, 'rope', {
          speed: { min: 50, max: 100 },
          scale: { start: 0.5, end: 0 },
          lifespan: 500,
          frequency: 100,
          blendMode: 'ADD',
          tint: 0xff0066
        });
      }
    } catch (error) {
      console.error('Error setting up player particles:', error);
    }
  }

  private setupRopeGlow() {
    try {
      // Create rope glow effect
      this.ropeGlow = this.add.graphics();
      this.ropeGlow.setDepth(1);
    } catch (error) {
      console.error('Error setting up rope glow:', error);
    }
  }

  private updateRopeTension() {
    if (!this.ropeTension || !this.rope) return;
    
    try {
      this.ropeTension.clear();
      
      // Calculate tension based on rope position
      const centerX = this.cameras.main.centerX;
      const distanceFromCenter = Math.abs(this.rope.x - centerX);
      const maxDistance = 350;
      const tension = Math.min(distanceFromCenter / maxDistance, 1);
      
      // Draw tension lines
      const tensionColor = Phaser.Display.Color.HSVToRGB(0, 1, tension).color;
      this.ropeTension.lineStyle(3, tensionColor, 0.7);
      
      if (this.player1 && this.player2) {
        // Draw tension lines from players to rope
        this.ropeTension.lineBetween(this.player1.x, this.player1.y, this.rope.x, this.rope.y);
        this.ropeTension.lineBetween(this.player2.x, this.player2.y, this.rope.x, this.rope.y);
      }
    } catch (error) {
      console.error('Error updating rope tension:', error);
    }
  }

  private updateRopeGlow() {
    if (!this.ropeGlow || !this.rope) return;
    
    try {
      this.ropeGlow.clear();
      
      // Calculate glow intensity based on rope velocity
      const velocity = Math.abs(this.rope.x - this.lastRopePosition);
      this.ropeVelocity = velocity;
      const glowIntensity = Math.min(velocity / 10, 1);
      
      if (glowIntensity > 0.1) {
        const glowColor = Phaser.Display.Color.HSVToRGB(0.6, 1, glowIntensity).color;
        this.ropeGlow.lineStyle(8, glowColor, 0.5);
        this.ropeGlow.strokeCircle(this.rope.x, this.rope.y, 25);
      }
      
      this.lastRopePosition = this.rope.x;
    } catch (error) {
      console.error('Error updating rope glow:', error);
    }
  }

  private updatePlayerAnimations() {
    try {
      if (this.player1) {
        // Add pulsing effect when player1 is pulling
        if (this.gameState?.player1Pulling) {
          const scale = 1.5 + Math.sin(this.time.now * 0.01) * 0.1;
          this.player1.setScale(scale);
        } else {
          this.player1.setScale(1.5);
        }
      }
      
      if (this.player2) {
        // Add pulsing effect when player2 is pulling
        if (this.gameState?.player2Pulling) {
          const scale = 1.5 + Math.sin(this.time.now * 0.01) * 0.1;
          this.player2.setScale(scale);
        } else {
          this.player2.setScale(1.5);
        }
      }
    } catch (error) {
      console.error('Error updating player animations:', error);
    }
  }

  private playPullEffect() {
    try {
      // Play pull sound
      if (this.soundEnabled && this.pullSound) {
        this.pullSound.play();
      }
      
      // Add screen shake effect
      this.cameras.main.shake(100, 0.01);
      
      // Flash effect on the pulling player
      if (this.gameState?.player1Pulling && this.player1) {
        this.player1.setTint(0xffff00);
        this.time.delayedCall(100, () => {
          if (this.player1) this.player1.setTint(0xffffff);
        });
      }
      
      if (this.gameState?.player2Pulling && this.player2) {
        this.player2.setTint(0xffff00);
        this.time.delayedCall(100, () => {
          if (this.player2) this.player2.setTint(0xffffff);
        });
      }
    } catch (error) {
      console.error('Error playing pull effect:', error);
    }
  }

  private playWinEffect(winner: string) {
    try {
      // Play win sound
      if (this.soundEnabled && this.winSound) {
        this.winSound.play();
      }
      
      // Play lose sound for the other player
      if (this.soundEnabled && this.loseSound) {
        this.loseSound.play();
      }
      
      // Add victory screen shake
      this.cameras.main.shake(500, 0.02);
      
      // Add particle burst effect
      if (this.rope) {
        this.add.particles(this.rope.x, this.rope.y, 'rope', {
          speed: { min: 100, max: 200 },
          scale: { start: 1, end: 0 },
          lifespan: 1000,
          quantity: 20,
          blendMode: 'ADD',
          tint: winner === 'player1' ? 0x0066ff : 0xff0066
        });
      }
    } catch (error) {
      console.error('Error playing win effect:', error);
    }
  }

  // Game Timer Methods
  private setupGameTimer() {
    console.log('Setting up game timer...');
    
    try {
      const centerX = this.cameras.main.centerX;
      const timerY = 50; // Position at top of screen
      
      // Create beautiful timer display with gradient
      this.gameTimer = this.add.text(centerX, timerY, `Time: ${this.gameTimeRemaining}s`, {
        fontSize: '36px',
        color: '#FFD700', // Gold color
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',
          blur: 4,
          fill: true
        }
      }).setOrigin(0.5).setDepth(10);
      
      // Add a subtle glow effect to timer
      const timerGlow = this.add.graphics();
      timerGlow.lineStyle(20, 0xFFD700, 0.2);
      timerGlow.strokeCircle(centerX, timerY, 60);
      timerGlow.setDepth(9);
      
      console.log('Game timer setup completed');
    } catch (error) {
      console.error('Error setting up game timer:', error);
    }
  }

  private startGameTimer() {
    console.log('Starting game timer...');
    
    try {
      // Reset timer
      this.gameTimeRemaining = this.GAME_DURATION;
      this.updateTimerDisplay();
      
      // Create timer event that fires every second
      this.timerEvent = this.time.addEvent({
        delay: 1000, // 1 second
        callback: this.updateTimer,
        callbackScope: this,
        loop: true
      });
      
      console.log('Game timer started');
    } catch (error) {
      console.error('Error starting game timer:', error);
    }
  }

  private updateTimer() {
    try {
      this.gameTimeRemaining--;
      this.updateTimerDisplay();
      
      // Check if time is up
      if (this.gameTimeRemaining <= 0) {
        this.handleTimeUp();
      }
      
      // Change color when time is running low
      if (this.gameTimeRemaining <= 10 && this.gameTimer) {
        this.gameTimer.setColor('#FF0000'); // Red for last 10 seconds
      } else if (this.gameTimeRemaining <= 30 && this.gameTimer) {
        this.gameTimer.setColor('#FFFF00'); // Yellow for last 30 seconds
      }
    } catch (error) {
      console.error('Error updating timer:', error);
    }
  }

  private updateTimerDisplay() {
    if (this.gameTimer) {
      this.gameTimer.setText(`Time: ${this.gameTimeRemaining}s`);
    }
  }

  private handleTimeUp() {
    console.log('⏰ Time is up! Determining winner by rope position...');
    
    try {
      // Stop the timer
      if (this.timerEvent) {
        this.timerEvent.destroy();
        this.timerEvent = null;
      }
      
      // Determine winner based on rope position
      const centerX = this.cameras.main.centerX;
      const ropePosition = this.rope ? this.rope.x : centerX;
      const distanceFromCenter = ropePosition - centerX;
      
      let winner: string;
      if (distanceFromCenter <= 0) {
        // Rope is on player1's side (left side)
        winner = 'player1';
        console.log('🏆 Time up - Player1 wins (rope closer to player1)');
      } else {
        // Rope is on player2's side (right side)
        winner = 'player2';
        console.log('🏆 Time up - Player2 wins (rope closer to player2)');
      }
      
      // Update game state with winner
      if (this.updateCallback) {
        this.updateCallback({
          winner,
          isStarted: false,
          player1Pulling: false,
          player2Pulling: false,
          countdown: undefined,
          isCountingDown: false
        });
      }
      
      // Show time up message
      this.showTimeUpMessage(winner);
      
    } catch (error) {
      console.error('Error handling time up:', error);
    }
  }

  private showTimeUpMessage(winner: string) {
    try {
      const centerX = this.cameras.main.centerX;
      const centerY = this.cameras.main.centerY;
      
      // Create time up announcement
      const timeUpText = this.add.text(centerX, centerY - 200, 'TIME\'S UP!', {
        fontSize: '48px',
        color: '#FF0000',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6
      }).setOrigin(0.5).setDepth(5);
      
      // Show winner based on rope position
      const winnerText = this.add.text(centerX, centerY - 140, `Winner: ${winner.toUpperCase()}`, {
        fontSize: '36px',
        color: '#FFD700',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5).setDepth(5);
      
      // Auto-remove messages after 3 seconds
      this.time.delayedCall(3000, () => {
        if (timeUpText) timeUpText.destroy();
        if (winnerText) winnerText.destroy();
      });
      
    } catch (error) {
      console.error('Error showing time up message:', error);
    }
  }

  private stopGameTimer() {
    console.log('Stopping game timer...');
    
    try {
      if (this.timerEvent) {
        this.timerEvent.destroy();
        this.timerEvent = null;
      }
      
      // Reset timer display
      this.gameTimeRemaining = this.GAME_DURATION;
      this.updateTimerDisplay();
      
      console.log('Game timer stopped');
    } catch (error) {
      console.error('Error stopping game timer:', error);
    }
  }

  private setupBasicGameObjects() {
    console.log('Setting up basic game objects...');
    
    try {
      const centerX = this.cameras.main.centerX;
      const centerY = this.cameras.main.centerY;
      
      console.log('Creating basic game objects at', { 
        centerX, 
        centerY, 
        gameWidth: this.cameras.main.width,
        gameHeight: this.cameras.main.height,
        expectedCenterX: 600,
        expectedCenterY: 400
      });

      // Cleanup existing objects first
      this.cleanupGameObjects();

      // Create beautiful center line with gradient
      this.centerLine = this.add.line(0, 0, centerX, 0, centerX, this.cameras.main.height, 0xff0000);
      this.centerLine.setLineWidth(5);
      
      // Add a glowing effect to the center line
      const glowGraphics = this.add.graphics();
      glowGraphics.lineStyle(15, 0xff0000, 0.3);
      glowGraphics.beginPath();
      glowGraphics.moveTo(centerX, 0);
      glowGraphics.lineTo(centerX, this.cameras.main.height);
      glowGraphics.strokePath();
      glowGraphics.setDepth(1);

      // Create game objects with default positions
      this.player1 = this.physics.add.sprite(centerX - 350, centerY, 'player1');
      this.player2 = this.physics.add.sprite(centerX + 350, centerY, 'player2');
      this.rope = this.physics.add.sprite(centerX, centerY, 'rope');
      
      console.log('🎮 Rope created at center position:', centerX, 'for screen width:', this.cameras.main.width);

      // Set up physics
      if (this.player1 && this.player2 && this.rope) {
        this.player1.setImmovable(true);
        this.player2.setImmovable(true);
        this.rope.setImmovable(true);

        // Scale and flip
        this.player1.setScale(1.5);
        this.player2.setScale(1.5);
        this.player2.setFlipX(true);
        this.rope.setScale(2);

        // Set initial tints with better colors
        this.player1.setTint(0x4CAF50); // Green for player1
        this.player2.setTint(0x2196F3); // Blue for player2

        // Set depth to ensure proper layering
        this.player1.setDepth(1);
        this.player2.setDepth(1);
        this.rope.setDepth(2);
        this.centerLine.setDepth(0);
      }

      // Create basic player displays
      this.createBasicPlayerDisplays();

      console.log('Basic game objects setup completed');
    } catch (error) {
      console.error('Error in setupBasicGameObjects:', error);
      this.cleanupGameObjects();
    }
  }

  private createBasicPlayerDisplays() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY - 200;

    // Create beautiful player labels with gradient
    this.scoreText1 = this.add.text(centerX - 350, centerY, 'Waiting for Player 1...', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 4,
        fill: true
      }
    }).setOrigin(0.5);

    this.scoreText2 = this.add.text(centerX + 350, centerY, 'Waiting for Player 2...', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 4,
        fill: true
      }
    }).setOrigin(0.5);

    // Create beautiful waiting text with animation
    this.waitingText = this.add.text(centerX, centerY + 100, 'Waiting for other player...', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: {
        offsetX: 3,
        offsetY: 3,
        color: '#000000',
        blur: 6,
        fill: true
      }
    }).setOrigin(0.5);
    
    // Add pulsing animation to waiting text
    this.tweens.add({
      targets: this.waitingText,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Display Room ID for easy sharing
    if (this.gameState?.roomId) {
      const roomIdText = this.add.text(centerX, centerY + 200, `Room ID: ${this.gameState.roomId}`, {
        fontSize: '24px',
        color: '#FFD700',
        fontFamily: 'Arial, sans-serif',
        stroke: '#000000',
        strokeThickness: 3,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',
          blur: 4,
          fill: true
        }
      }).setOrigin(0.5);
      
      // Add subtle animation to room ID
      this.tweens.add({
        targets: roomIdText,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private updatePlayerDisplays() {
    console.log('🔄 updatePlayerDisplays called');
    console.log('Game state players:', this.gameState?.players);
    console.log('Game state roomId:', this.gameState?.roomId);
    console.log('Is initialized:', this.isInitialized);
    
    if (!this.gameState?.players || !this.isInitialized) {
      console.log('❌ Cannot update player displays - missing players or not initialized');
      return;
    }

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY - 200;

    const players = this.gameState.players;
    const playerEntries = Object.entries(players);
    
    console.log('🔍 Player entries:', playerEntries);
    console.log('🔍 Looking for player1 and player2...');

    // Find player1 and player2
    const player1Data = playerEntries.find(([, player]) => player.role === 'player1');
    const player2Data = playerEntries.find(([, player]) => player.role === 'player2');
    
    console.log('🔍 Found player1Data:', player1Data);
    console.log('🔍 Found player2Data:', player2Data);

    // Update player labels with better visibility
    if (this.scoreText1) this.scoreText1.destroy();
    if (this.scoreText2) this.scoreText2.destroy();

    if (player1Data) {
      const [address, player] = player1Data;
      const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
      const status = player.isReady ? 'Ready' : 'Not Ready';
      const text = `Player 1: ${shortAddress} (${status})`;
      console.log('📝 Creating player1 text:', text);
      this.scoreText1 = this.add.text(centerX - 350, centerY, text, {
        fontSize: '32px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5);
    } else {
      console.log('📝 Creating default player1 text: Waiting for Player 1...');
      this.scoreText1 = this.add.text(centerX - 350, centerY, 'Waiting for Player 1...', {
        fontSize: '32px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5);
    }

    if (player2Data) {
      const [address, player] = player2Data;
      const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
      const status = player.isReady ? 'Ready' : 'Not Ready';
      const text = `Player 2: ${shortAddress} (${status})`;
      this.scoreText2 = this.add.text(centerX + 350, centerY, text, {
        fontSize: '32px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5);
    } else {
      this.scoreText2 = this.add.text(centerX + 350, centerY, 'Waiting for Player 2...', {
        fontSize: '32px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5);
    }

    // Update waiting text
    if (this.waitingText) this.waitingText.destroy();
    if (!this.gameState.isStarted && (!player2Data || !player2Data[1].isReady)) {
      this.waitingText = this.add.text(centerX, centerY + 100, 'Waiting for other player...', {
        fontSize: '48px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5);
    }

    // Update key instruction or countdown
    if (this.keyText) this.keyText.destroy();
    
    if (this.gameState.isCountingDown && this.gameState.countdown !== undefined) {
      // Show countdown at center of canvas (above the game area)
      this.keyText = this.add.text(centerX, centerY, `${this.gameState.countdown}`, {
        fontSize: '120px',
        color: '#ffff00',
        fontFamily: 'Arial, sans-serif',
        stroke: '#000000',
        strokeThickness: 8
      }).setOrigin(0.5);
    } else if (this.gameState.isStarted) {
      // Show game instruction
      this.keyText = this.add.text(centerX, centerY - 100, 'Press SPACE to pull!', {
        fontSize: '36px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5);
    }

    // Set text depth
    [this.scoreText1, this.scoreText2, this.waitingText, this.keyText].forEach(text => {
      if (text) text.setDepth(3);
    });
    

  }

  private setupGame() {
    if (!this.gameState || !this.isInitialized) {
      console.log('Cannot setup game - scene not initialized or no game state');
      return;
    }

    console.log('Setting up game...');
    
    try {
      const centerX = this.cameras.main.centerX;
      const centerY = this.cameras.main.centerY;
      
      console.log('Creating game objects at', { centerX, centerY });

      // Cleanup existing objects first
      this.cleanupGameObjects();

      // Create center line first
      this.centerLine = this.add.line(0, 0, centerX, 0, centerX, this.cameras.main.height, 0x666666);
      this.centerLine.setLineWidth(2);

      // Create game objects
      this.player1 = this.physics.add.sprite(centerX - 350, centerY, 'player1');
      this.player2 = this.physics.add.sprite(centerX + 350, centerY, 'player2');
      
      // Initialize rope at the stored position or center
      const initialRopeX = this.clampRopePosition(
        typeof this.gameState.ropePosition === 'number' 
          ? this.gameState.ropePosition 
          : this.defaultRopePosition
      );
      console.log('Initializing rope at position:', initialRopeX);
      this.rope = this.physics.add.sprite(initialRopeX, centerY, 'rope');

      // Setup player role and address if not already set
      if (!this.playerRole || !this.currentPlayerAddress) {
        console.log('🔧 Setting up player role and address...');
        console.log('Current gameState:', this.gameState);
        console.log('Players:', this.gameState?.players);
        
        if (this.gameState?.players) {
          const players = Object.entries(this.gameState.players || {});
          console.log('Player entries:', players);
          
          // Try to find current player
          for (const [address, player] of players) {
            console.log('Checking player:', { address, player });
            // For now, assume the first player is the current player
            if (player.role === 'player1') {
              this.playerRole = 'player1';
              this.currentPlayerAddress = address;
              console.log('✅ Set as player1:', address);
              break;
            } else if (player.role === 'player2') {
              this.playerRole = 'player2';
              this.currentPlayerAddress = address;
              console.log('✅ Set as player2:', address);
              break;
            }
          }
        }
        
        console.log('Final player setup:', {
          playerRole: this.playerRole,
          currentAddress: this.currentPlayerAddress
        });
      }

      // Set up physics
      if (this.player1 && this.player2 && this.rope) {
        this.player1.setImmovable(true);
        this.player2.setImmovable(true);
        this.rope.setImmovable(true);

        // Scale and flip
        this.player1.setScale(1.5);
        this.player2.setScale(1.5);
        this.player2.setFlipX(true);
        this.rope.setScale(2);

        // Set initial tints based on pulling state
        this.player1.setTint(this.gameState.player1Pulling ? 0xff0000 : 0xffffff);
        this.player2.setTint(this.gameState.player2Pulling ? 0xff0000 : 0xffffff);

        // Set depth to ensure proper layering
        this.player1.setDepth(1);
        this.player2.setDepth(1);
        this.rope.setDepth(2);
        this.centerLine.setDepth(0);
      }

      // Update player displays
      this.updatePlayerDisplays();

      console.log('Game setup completed');
    } catch (error) {
      console.error('Error in setupGame:', error);
      this.cleanupGameObjects();
    }
  }

  private setupInput() {
    const now = Date.now();
    
    // Prevent multiple setups within 100ms
    if (now - this.lastInputSetupTime < 100) {
      console.log('Skipping input setup - too soon since last setup');
      return;
    }
    
    this.inputSetupCount++;
    this.lastInputSetupTime = now;
    console.log(`Setting up input (attempt #${this.inputSetupCount})...`);
    
    // Always remove any existing input first
    if (this.spaceKey) {
      console.log('Removing existing space key listeners...');
      this.spaceKey.removeAllListeners();
      this.spaceKey = null;
    }
    
    // Also remove the key from keyboard manager to prevent duplicates
    if (this.input.keyboard) {
      console.log('Removing all keys from keyboard manager...');
      this.input.keyboard.removeAllKeys();
      this.input.keyboard.enabled = true;
    }

    // Add new input
    console.log('Adding new input...');
    
    // Enable keyboard input
    if (this.input.keyboard) {
      // Create key object
      const key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      
      if (key) {
        this.spaceKey = key;
        
        // Enable input
        this.spaceKey.enabled = true;
        
        this.spaceKey.on('down', () => {
          console.log('Space key pressed, current state:', {
            pullCooldown: this.pullCooldown,
            playerRole: this.playerRole,
            isStarted: this.gameState?.isStarted,
            currentAddress: this.currentPlayerAddress,
            players: this.gameState?.players,
            isInitialized: this.isInitialized,
            gameState: this.gameState
          });

          if (this.pullCooldown > 0) {
            console.log('Cannot pull - on cooldown');
            return;
          }

          if (!this.playerRole) {
            console.log('Cannot pull - no role assigned');
            return;
          }
          if (!this.gameState?.isStarted) {
            console.log('Cannot pull - game not started');
            return;
          }
          if (!this.currentPlayerAddress) {
            console.log('Cannot pull - no current address');
            return;
          }

          // Find player data using case-insensitive comparison
          const playerData = Object.entries(this.gameState.players).find(
            ([addr]) => addr.toLowerCase() === this.currentPlayerAddress?.toLowerCase()
          );

          if (!playerData || !playerData[1].isReady) {
            console.log('Cannot pull - player not ready');
            return;
          }

          console.log('All conditions met, handling pull...');
          this.handlePull();
          this.pullCooldown = this.PULL_COOLDOWN_TIME;
        });

        // Loại bỏ space key release event vì không cần thiết nữa
        // this.spaceKey.on('up', () => { ... });

        // Enable input plugin
        this.input.enabled = true;
        
        this.inputInitialized = true;
        console.log('Input setup completed');
      } else {
        console.error('Failed to setup input - keyboard not available');
      }
    } else {
      console.error('Failed to setup input - keyboard not available');
    }
  }

  private handlePull() {
    const now = Date.now();
    if (now - this.lastStateUpdateTime < this.STATE_UPDATE_THROTTLE) {
      console.log('🎮 Throttled pull update');
      return;
    }

    if (this.playerRole === 'player1' && this.currentPlayer1Pulling) {
      console.log('🎮 Player1 already pulling, skipping duplicate update');
      return;
    }
    if (this.playerRole === 'player2' && this.currentPlayer2Pulling) {
      console.log('🎮 Player2 already pulling, skipping duplicate update');
      return;
    }

    this.lastStateUpdateTime = now;
    
    if (this.playerRole === 'player1') {
      this.currentPlayer1Pulling = true;
      console.log('🎮 Player1 starting to pull (one-time)');
    } else if (this.playerRole === 'player2') {
      this.currentPlayer2Pulling = true;
      console.log('🎮 Player2 starting to pull (one-time)');
    }

    // Play pull effect (sound and visual)
    this.playPullEffect();

    // Gửi state update ngay lập tức (không cần delay)
    if (this.updateCallback) {
      this.updateCallback({
        player1Pulling: this.currentPlayer1Pulling,
        player2Pulling: this.currentPlayer2Pulling
      });
    }

    // Reset local state ngay lập tức (game loop sẽ reset global state)
    this.currentPlayer1Pulling = false;
    this.currentPlayer2Pulling = false;
  }

  private clampRopePosition(position: number): number {
    const centerX = this.cameras.main.centerX;
    return Math.max(
      centerX - 350 + this.ROPE_BOUNDS_MARGIN,
      Math.min(centerX + 350 - this.ROPE_BOUNDS_MARGIN, position)
    );
  }

  update(time: number, delta: number) {
    // Don't process if scene is being destroyed
    if (this.isDestroyed) {
      return;
    }

    // Update cooldown
    if (this.pullCooldown > 0) {
      this.pullCooldown = Math.max(0, this.pullCooldown - delta);
    }

    // Show debug logs when game is started
    if (this.gameState?.isStarted && time % 1000 < 16) {
      console.log('=== Game Active Debug ===');
      console.log('Game started:', this.gameState?.isStarted);
      console.log('Space key exists:', !!this.spaceKey);
      console.log('Player role:', this.playerRole);
      console.log('Pull cooldown:', this.pullCooldown);
      console.log('Game objects exist:', {
        rope: !!this.rope,
        player1: !!this.player1,
        player2: !!this.player2
      });
      console.log('==================');
    }

    // Only process input when game is started and all objects exist
    if (!this.gameState?.isStarted) {
      return;
    }

    // Ensure all game objects exist
    if (!this.rope || !this.player1 || !this.player2) {
      console.log('❌ Missing game objects, cannot process input');
      return;
    }

    // Ensure space key exists (only log if game is started)
    if (!this.spaceKey && this.input && this.input.keyboard && !this.isDestroyed) {
      if (this.gameState.isStarted) {
        console.log('🔧 Creating space key in update...');
      }
      const success = this.initializeSpaceKey();
      if (!success && this.gameState.isStarted) {
        console.log('⚠️ Failed to initialize space key, will retry next frame');
      }
    }

    // Additional debugging to track space key state (only when game is started)
    if (this.spaceKey && !this.spaceKey.enabled && this.gameState.isStarted) {
      console.log('⚠️ Space key exists but is disabled, re-enabling...');
      this.spaceKey.enabled = true;
    }

    // If space key is still null after trying to create it, log more details (only when game is started)
    if (!this.spaceKey && this.gameState.isStarted) {
      console.log('❌ Space key is still null after initialization attempt');
      console.log('Input system state:', {
        input: !!this.input,
        keyboard: !!this.input?.keyboard,
        isDestroyed: this.isDestroyed,
        isInitialized: this.isInitialized
      });
      
      // If we had a space key before but it's now null, it was lost unexpectedly
      if (this.spaceKeyCreatedAt > 0) {
        console.log('⚠️ Space key was lost unexpectedly! It was created at:', this.spaceKeyCreatedAt);
        console.log('This might indicate the scene was recreated or the input system was reset');
      }
    }

    // Input handling is now done in setupInput() method with 'down' and 'up' events
    // This prevents duplicate input processing that was causing continuous pulling
  }

  private async handleWin(winner: string) {
    console.log('🏆 handleWin method called with winner:', winner);
    console.log('🏆 Game state check:', {
      isStarted: this.gameState?.isStarted,
      updateCallback: !!this.updateCallback,
      rope: !!this.rope
    });
    
    if (!this.updateCallback || !this.rope) {
      console.log('❌ handleWin early return - conditions not met');
      return;
    }

    console.log('✅ handleWin proceeding to create win screen');
    
    // Stop the game timer since someone won
    this.stopGameTimer();
    
    // Play win effects (sound and visual)
    this.playWinEffect(winner);
    
    // Note: finishGame is now handled in Game.tsx game loop to prevent duplicate calls
    // This method only handles UI display and effects
    console.log('🎮 GameScene handleWin: Only handling UI display, blockchain finishGame handled by Game.tsx');
    
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Find winner's address
    const winnerData = this.gameState ? Object.entries(this.gameState.players).find(([, data]) => data.role === winner) : null;
    const winnerAddress = winnerData ? winnerData[0].slice(-5) : '?????';

    console.log('🏆 Displaying win screen for:', winner, 'Address:', winnerAddress);

    // Create background overlay
    const overlay = this.add.rectangle(centerX, centerY, 1200, 800, 0x000000, 0.8);
    overlay.setDepth(3);

    // Create beautiful win announcement with gradient
    const winAnnouncement = this.add.text(centerX, centerY - 120, 'WINNER!', {
      fontSize: '72px',
      color: '#FFD700',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 10,
      shadow: {
        offsetX: 3,
        offsetY: 3,
        color: '#000000',
        blur: 8,
        fill: true
      }
    }).setOrigin(0.5).setDepth(4);
    
    // Add rainbow effect to winner text
    this.tweens.add({
      targets: winAnnouncement,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Create winner text with better styling
    const winText = this.add.text(centerX, centerY - 40, `🎉 ${winner.toUpperCase()} 🎉`, {
      fontSize: '80px',
      color: '#FF6B6B',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 8
    }).setOrigin(0.5).setDepth(4);

    // Create player info text
    const playerText = this.add.text(centerX, centerY + 60, `Player ${winnerAddress}`, {
      fontSize: '56px',
      color: '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(4);

    // Create instruction text
    const instructionText = this.add.text(centerX, centerY + 140, 'Game has ended!', {
      fontSize: '36px',
      color: '#CCCCCC',
      fontFamily: 'Arial, sans-serif',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(4);

    // Create "Create New Game" button
    const buttonWidth = 400; // Increased from 300 to 400
    const buttonHeight = 80;
    const buttonX = centerX;
    const buttonY = centerY + 220;

    // Button background
    const buttonBg = this.add.rectangle(buttonX, buttonY, buttonWidth, buttonHeight, 0x4CAF50);
    buttonBg.setDepth(4);

    // Button text
    const buttonText = this.add.text(buttonX, buttonY, 'CREATE NEW GAME', {
      fontSize: '32px',
      color: '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(5);

    // Make button interactive
    buttonBg.setInteractive();
    buttonText.setInteractive();

    // Button hover effects
    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0x45A049);
    });

    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0x4CAF50);
    });

    // Button click handler
    const handleButtonClick = () => {
              console.log('🔄 User clicked "Create New Game" button');
      
      // Clean up win screen
      overlay.destroy();
      winAnnouncement.destroy();
      winText.destroy();
      playerText.destroy();
      instructionText.destroy();
      buttonBg.destroy();
      buttonText.destroy();
      
      // Reset winner tracking
      this.lastWinner = null;
      
      // Navigate to home page to create new game
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    };

    buttonBg.on('pointerdown', handleButtonClick);
    buttonText.on('pointerdown', handleButtonClick);

    // Reset game state
    const finalRopePosition = winner === 'player1' 
      ? 300 // Player1 win position
      : 900; // Player2 win position
    this.rope.x = finalRopePosition;
    if (this.player1) this.player1.setTint(0xffffff);
    if (this.player2) this.player2.setTint(0xffffff);

    this.updateCallback({
      isStarted: false,
      winner,
      player1Pulling: false,
      player2Pulling: false,
      ropePosition: finalRopePosition,
      countdown: undefined,
      isCountingDown: false
    });
  }

  private cleanupGameObjects() {
    console.log('Cleaning up game objects...');
    
    // Remove input listeners first
    if (this.spaceKey) {
      this.spaceKey.removeAllListeners();
      this.spaceKey = null;
    }
    
    // Destroy all game objects
    if (this.player1) {
      this.player1.destroy();
      this.player1 = null;
    }
    if (this.player2) {
      this.player2.destroy();
      this.player2 = null;
    }
    if (this.rope) {
      this.rope.destroy();
      this.rope = null;
    }
    if (this.waitingText) {
      this.waitingText.destroy();
      this.waitingText = null;
    }
    if (this.keyText) {
      this.keyText.destroy();
      this.keyText = null;
    }
    if (this.centerLine) {
      this.centerLine.destroy();
      this.centerLine = null;
    }
    if (this.scoreText1) {
      this.scoreText1.destroy();
      this.scoreText1 = null;
    }
    if (this.scoreText2) {
      this.scoreText2.destroy();
      this.scoreText2 = null;
    }
    
    // Cleanup visual effects
    if (this.ropeTension) {
      this.ropeTension.destroy();
      this.ropeTension = null;
    }
    if (this.ropeGlow) {
      this.ropeGlow.destroy();
      this.ropeGlow = null;
    }
    if (this.playerParticles.player1) {
      this.playerParticles.player1.destroy();
      this.playerParticles.player1 = null;
    }
    if (this.playerParticles.player2) {
      this.playerParticles.player2.destroy();
      this.playerParticles.player2 = null;
    }
    
    // Cleanup timer
    if (this.gameTimer) {
      this.gameTimer.destroy();
      this.gameTimer = null;
    }
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }
  }

  private cleanupInput() {
    console.log('Cleaning up input system...');
    if (this.spaceKey) {
      console.log('Removing space key listeners...');
      this.spaceKey.removeAllListeners();
      this.spaceKey = null;
    }
    if (this.input.keyboard) {
      console.log('Removing all keys from keyboard manager...');
      this.input.keyboard.removeAllKeys();
    }
    this.inputInitialized = false;
    this.inputSetupCount = 0;
    this.lastInputSetupTime = 0;
    this.lastStateUpdateTime = 0;
    this.currentPlayer1Pulling = false;
    this.currentPlayer2Pulling = false;
  }

  private cleanup() {
    // Clean up game objects
    this.cleanupGameObjects();

    // Reset all properties except isInitialized and inputInitialized
    this.gameState = null;
    this.updateCallback = null;
    this.currentPlayerAddress = null;
    this.playerRole = null;
    this.pullCooldown = 0;
  }

  destroy() {
    if (!this.isDestroyed) {
      this.isDestroyed = true;
      this.cleanupInput();
      this.cleanupGameObjects();
    }
  }

  private initializeSpaceKey(): boolean {
    if (this.spaceKey) {
      console.log('🔧 Space key already exists, skipping initialization');
      return true;
    }

    if (!this.input || !this.input.keyboard) {
      console.log('⚠️ Cannot initialize space key - input system not ready');
      return false;
    }

    // Additional check to ensure keyboard is enabled
    if (!this.input.keyboard.enabled) {
      console.log('⚠️ Keyboard is disabled, attempting to re-enable...');
      this.input.keyboard.enabled = true;
      if (!this.input.keyboard.enabled) {
        console.log('❌ Failed to re-enable keyboard');
        return false;
      }
      console.log('✅ Keyboard re-enabled successfully');
    }

    // Check if the scene is being destroyed
    if (this.isDestroyed) {
      console.log('⚠️ Cannot initialize space key - scene is being destroyed');
      return false;
    }

    console.log('🔧 Initializing space key...');
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    if (this.spaceKey) {
      this.spaceKey.enabled = true;
      this.spaceKeyCreatedAt = Date.now();
      console.log('✅ Space key created successfully:', this.spaceKey);
      console.log('Space key enabled:', this.spaceKey.enabled);
      console.log('Keyboard enabled:', this.input.keyboard.enabled);
      console.log('Space key created at:', this.spaceKeyCreatedAt);
      return true;
    } else {
      console.log('❌ Failed to create space key');
      return false;
    }
  }

  private initializeSpaceKeyWithRetry(maxRetries = 5): void {
    let retryCount = 0;
    
    const tryInitialize = () => {
      console.log(`🔧 Attempting to initialize space key (attempt ${retryCount + 1}/${maxRetries})...`);
      
      if (this.input && this.input.keyboard) {
        // Clear any existing keys first
        this.input.keyboard.removeAllKeys();
        this.input.keyboard.enabled = true;
        
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        if (this.spaceKey) {
          this.spaceKey.enabled = true;
          this.spaceKeyCreatedAt = Date.now();
          console.log('✅ Space key initialized successfully');
          console.log('Space key enabled:', this.spaceKey.enabled);
          console.log('Keyboard enabled:', this.input.keyboard.enabled);
          return true;
        } else {
          console.log('❌ Failed to create space key');
        }
      } else {
        console.log('❌ Input system not available');
      }
      
      retryCount++;
      if (retryCount < maxRetries) {
        console.log(`⏳ Retrying in 100ms...`);
        setTimeout(tryInitialize, 100);
      } else {
        console.log('❌ Failed to initialize space key after all retries');
      }
      
      return false;
    };
    
    tryInitialize();
  }
} 
# 🎮 Tug of War - Blockchain Game

A real-time multiplayer tug-of-war game built on the Monad blockchain with automatic reward distribution.

## 🚀 Features

- **Real-time Multiplayer**: Play with friends using Multisynq for instant synchronization
- **Blockchain Integration**: Stake MON tokens and earn rewards automatically
- **Smart Contract**: Built on Monad Testnet with automatic reward distribution
- **Modern UI**: Beautiful React + TypeScript + Tailwind CSS interface
- **Game Engine**: Phaser.js for smooth game animations and physics

## 🎯 How to Play

1. **Connect Wallet**: Connect your MetaMask wallet to Monad Testnet
2. **Create/Join Game**: Create a new game room or join an existing one
3. **Stake Tokens**: Stake 0.01 MON to confirm you're ready to play
4. **Start Game**: Player1 (room creator) starts the game with a 3-2-1 countdown
5. **Pull the Rope**: Press SPACE to pull the rope (10 units per pull)
6. **Win**: First player to pull the rope to their side wins!
7. **Rewards**: Winner automatically receives the staked tokens

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Game Engine**: Phaser.js
- **Real-time Sync**: Multisynq (@multisynq/react-together)
- **Blockchain**: Ethers.js + Monad Testnet
- **Smart Contract**: Solidity (TugOfWarAutoReward.sol)

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/tug-of-war.git
cd tug-of-war

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# Multisynq API Key (get from https://multisynq.com)
VITE_MULTISYNQ_API_KEY=your_multisynq_api_key_here

# Optional: Override default blockchain config
VITE_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
VITE_CONTRACT_ADDRESS=0x482fA97B7D81f30135BE10CBAE0d9176Beb87C7c
VITE_CHAIN_ID=10143
```

### Smart Contract Deployment
1. Navigate to `contracts-hardhat/`
2. Install dependencies: `npm install`
3. Deploy contract: `npx hardhat run scripts/deploy-auto-reward.ts --network monad-testnet`

## 🚀 Deployment

### Vercel Deployment
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard:
   - `VITE_MULTISYNQ_API_KEY`: Your Multisynq API key
4. Deploy!

### Manual Build
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎮 Game Controls

- **SPACE**: Pull the rope (one-time pull per game)
- **Rope Movement**: 10 units per pull
- **Win Condition**: Rope reaches 85% of max distance
- **Time Limit**: 60 seconds - closest player wins if time runs out

## 🔗 Links

- **Live Demo**: [Deployed on Vercel]
- **Monad Testnet**: https://testnet.monadexplorer.com
- **Contract**: 0x482fA97B7D81f30135BE10CBAE0d9176Beb87C7c

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 🐛 Issues

If you find any bugs or have suggestions, please open an issue on GitHub.

---

**Built with ❤️ on Monad Blockchain**

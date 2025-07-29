export const BLOCKCHAIN_CONFIG = {
  // Monad Testnet Configuration
  monad: {
    chainId: 10143,
    rpcUrl: 'https://testnet-rpc.monad.xyz',
    name: 'Monad Testnet',
    currency: {
      name: 'MON',
      symbol: 'MON',
      decimals: 18
    },
    blockExplorer: 'https://explorer.testnet.monad.xyz'
  },
  
  // Contract Addresses - Using new auto-reward contract
  contracts: {
    // New deployed TugOfWarAutoReward contract address (updated with simple stake logic)
    tugOfWar: '0x482fA97B7D81f30135BE10CBAE0d9176Beb87C7c',
    // No separate MON token contract needed - using native MON token
  },
  
  // Game Configuration
  game: {
    stakeAmount: '0.01', // MON amount for staking (native token)
    maxPlayers: 2,
    gameDuration: 60 // seconds
  }
};

export const getContractConfig = () => {
  return {
    tugOfWarAddress: BLOCKCHAIN_CONFIG.contracts.tugOfWar,
    rpcUrl: BLOCKCHAIN_CONFIG.monad.rpcUrl,
    chainId: BLOCKCHAIN_CONFIG.monad.chainId
  };
};

export const addMonadNetwork = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: `0x${BLOCKCHAIN_CONFIG.monad.chainId.toString(16)}`,
          chainName: BLOCKCHAIN_CONFIG.monad.name,
          nativeCurrency: BLOCKCHAIN_CONFIG.monad.currency,
          rpcUrls: [BLOCKCHAIN_CONFIG.monad.rpcUrl],
          blockExplorerUrls: [BLOCKCHAIN_CONFIG.monad.blockExplorer]
        }
      ]
    });
    console.log('✅ Monad Testnet added to MetaMask');
  } catch (error) {
    console.error('❌ Failed to add Monad Testnet:', error);
    throw error;
  }
};

export const switchToMonadNetwork = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${BLOCKCHAIN_CONFIG.monad.chainId.toString(16)}` }]
    });
    console.log('✅ Switched to Monad Testnet');
  } catch (error) {
    console.error('❌ Failed to switch to Monad Testnet:', error);
    // If the network doesn't exist, try to add it
    if ((error as any).code === 4902) {
      await addMonadNetwork();
    } else {
      throw error;
    }
  }
}; 
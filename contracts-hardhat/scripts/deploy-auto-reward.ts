import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting deployment of TugOfWarAutoReward to Monad Testnet...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "MON");

  if (balance < ethers.parseEther("0.1")) {
    throw new Error("Insufficient balance for deployment. Need at least 0.1 MON");
  }

  // Deploy TugOfWarAutoReward contract
  console.log("🎮 Deploying TugOfWarAutoReward contract...");
  const TugOfWarAutoReward = await ethers.getContractFactory("TugOfWarAutoReward");
  const tugOfWarAutoReward = await TugOfWarAutoReward.deploy();
  await tugOfWarAutoReward.waitForDeployment();
  const contractAddress = await tugOfWarAutoReward.getAddress();
  console.log("✅ TugOfWarAutoReward deployed to:", contractAddress);

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  
  // Check contract details
  const stakeAmount = await (tugOfWarAutoReward as any).STAKE_AMOUNT();
  const owner = await (tugOfWarAutoReward as any).owner();
  console.log(`✅ TugOfWarAutoReward: Stake amount ${ethers.formatEther(stakeAmount)} MON`);
  console.log(`✅ Contract owner: ${owner}`);

  // Output configuration for frontend
  console.log("\n📋 Configuration for frontend:");
  console.log("Update src/config/blockchain.ts with this address:");
  console.log(`tugOfWar: '${contractAddress}',`);

  // Save deployment info to file
  const deploymentInfo = {
    network: "Monad Testnet",
    deployer: deployer.address,
    contract: {
      name: "TugOfWarAutoReward",
      address: contractAddress,
      stakeAmount: ethers.formatEther(stakeAmount),
      owner: owner,
      features: [
        "Automatic reward distribution",
        "Native MON token support",
        "Room-based game management",
        "Emergency withdrawal function"
      ]
    },
    timestamp: new Date().toISOString()
  };

  const fs = require('fs');
  fs.writeFileSync('deployment-auto-reward.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment info saved to deployment-auto-reward.json");

  console.log("\n🎉 Deployment completed successfully!");
  console.log("🔗 View contract on explorer:");
  console.log(`TugOfWarAutoReward: https://explorer.testnet.monad.xyz/address/${contractAddress}`);
  
  console.log("\n🎮 Contract Features:");
  console.log("✅ Automatic reward distribution when game finishes");
  console.log("✅ Native MON token support (no ERC20 required)");
  console.log("✅ Room-based game management");
  console.log("✅ Stake retrieval for incomplete games");
  console.log("✅ Emergency withdrawal function for owner");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 
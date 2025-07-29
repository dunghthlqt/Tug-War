import { ethers } from "hardhat";

async function main() {
  const TugOfWar = await ethers.getContractFactory("TugOfWar");
  const tugOfWar = await TugOfWar.deploy();

  await tugOfWar.waitForDeployment();

  console.log(
    `TugOfWar deployed to ${await tugOfWar.getAddress()}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 
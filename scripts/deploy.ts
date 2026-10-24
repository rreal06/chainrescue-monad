import hre from "hardhat";

const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No deployer available. Set DEPLOYER_PRIVATE_KEY in .env.");

  const ChainRescue = await ethers.getContractFactory("ChainRescue");
  const chainRescue = await ChainRescue.deploy(deployer.address);
  await chainRescue.waitForDeployment();

  const address = await chainRescue.getAddress();
  console.log(`ChainRescue deployed to: ${address}`);
  console.log(`Demo admin: ${deployer.address}`);
  console.log(`Add VITE_CHAIN_RESCUE_ADDRESS=${address} to your .env for the dashboard.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import hre from "hardhat";

const { ethers } = hre;

async function main() {
  const contractAddress = process.env.CHAIN_RESCUE_ADDRESS;
  const verifierOne = process.env.VERIFIER_ONE_ADDRESS;
  const verifierTwo = process.env.VERIFIER_TWO_ADDRESS;

  if (!contractAddress || !verifierOne || !verifierTwo) {
    throw new Error("Set CHAIN_RESCUE_ADDRESS, VERIFIER_ONE_ADDRESS, and VERIFIER_TWO_ADDRESS in .env.");
  }
  if (verifierOne.toLowerCase() === verifierTwo.toLowerCase()) {
    throw new Error("Verifier addresses must be different.");
  }

  const [admin] = await ethers.getSigners();
  const contract = await ethers.getContractAt("ChainRescue", contractAddress, admin);
  if ((await contract.admin()).toLowerCase() !== admin.address.toLowerCase()) {
    throw new Error("DEPLOYER_PRIVATE_KEY must belong to the ChainRescue demo admin.");
  }

  for (const verifier of [verifierOne, verifierTwo]) {
    const tx = await contract.setVerifier(verifier, true);
    await tx.wait();
    console.log(`Authorized verifier: ${verifier} (${tx.hash})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

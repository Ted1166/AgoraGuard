import hre  from "hardhat";
import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const connection = await hre.network.getOrCreate("arcTestnet");
  const viem       = connection.viem;

  const [deployer] = await viem.getWalletClients();
  const deployerAddress = deployer.account.address;

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║         AgoraGuard Contract Deployment       ║");
  console.log("╚══════════════════════════════════════════════╝\n");
  console.log(`Deployer : ${deployerAddress}`);
  console.log(`Network  : arcTestnet\n`);

  const guardianAddress = (process.env.GUARDIAN_ADDRESS ?? deployerAddress) as `0x${string}`;
  console.log(`Guardian : ${guardianAddress}\n`);

  // 1. RiskGuardOracle
  console.log("Deploying RiskGuardOracle...");
  const oracle = await viem.deployContract("RiskGuardOracle", [guardianAddress]);
  console.log(`✓ RiskGuardOracle  → ${oracle.address}`);

  // 2. ThreatRegistry
  console.log("Deploying ThreatRegistry...");
  const registry = await viem.deployContract("ThreatRegistry", [guardianAddress]);
  console.log(`✓ ThreatRegistry   → ${registry.address}`);

  // 3. GuardianVault
  console.log("Deploying GuardianVault...");
  const vault = await viem.deployContract("GuardianVault", [
    guardianAddress,
    oracle.address,
  ]);
  console.log(`✓ GuardianVault    → ${vault.address}`);

  const addresses = {
    network:         "arcTestnet",
    deployer:        deployerAddress,
    guardian:        guardianAddress,
    riskGuardOracle: oracle.address,
    threatRegistry:  registry.address,
    guardianVault:   vault.address,
    deployedAt:      new Date().toISOString(),
    arc: {
      usdc:               "0x3600000000000000000000000000000000000000",
      eurc:               "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
      explorer:           "https://testnet.arcscan.app",
      faucet:             "https://faucet.circle.com",
      identityRegistry:   "0x8004A818BFB912233c491871b3d84c89A494BD9e",
      reputationRegistry: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
    },
  };

  const outPath = path.join(__dirname, "../addresses.json");
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));

  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  RiskGuardOracle  ${oracle.address}`);
  console.log(`  ThreatRegistry   ${registry.address}`);
  console.log(`  GuardianVault    ${vault.address}`);
  console.log(`═══════════════════════════════════════════════`);
  console.log(`\n  addresses.json → ${outPath}`);
  console.log(`  Explorer: https://testnet.arcscan.app\n`);
  console.log("  Add to your agent .env:\n");
  console.log(`  GUARDIAN_VAULT_ADDRESS=${vault.address}`);
  console.log(`  THREAT_REGISTRY_ADDRESS=${registry.address}`);
  console.log(`  RISK_GUARD_ORACLE_ADDRESS=${oracle.address}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
import hre from "hardhat";
import assert from "node:assert";
import { describe, it, beforeEach } from "node:test";
import { parseUnits, getAddress }   from "viem";

const CLEAR   = 0;
const CAUTION = 1;
const HALT    = 2;
const ASSET   = "0x000000000000000000000000000000000000dEaD" as `0x${string}`;

describe("AgoraGuard Contracts", () => {

  let viem:      any;
  let guardian:  any;
  let user1:     any;
  let user2:     any;
  let attacker:  any;
  let oracle:    any;
  let registry:  any;
  let vault:     any;
  let mockToken: any;

  async function writeAs(
    contract:     any,
    functionName: string,
    args:         any[],
    wallet:       any,
  ) {
    return wallet.writeContract({
      address:      contract.address,
      abi:          contract.abi,
      functionName,
      args,
    });
  }

  beforeEach(async () => {
    const connection = await hre.network.getOrCreate("hardhat");
    viem = connection.viem;

    const wallets = await viem.getWalletClients();
    guardian = wallets[0];
    user1    = wallets[1];
    user2    = wallets[2];
    attacker = wallets[3];

    mockToken = await viem.deployContract("MockERC20", [
      "Mock USDC", "mUSDC", user1.account.address,
    ]);
    oracle = await viem.deployContract("RiskGuardOracle", [
      guardian.account.address,
    ]);
    registry = await viem.deployContract("ThreatRegistry", [
      guardian.account.address,
    ]);
    vault = await viem.deployContract("GuardianVault", [
      guardian.account.address,
      oracle.address,
    ]);
  });


  describe("RiskGuardOracle", () => {

    it("deploys with correct guardian", async () => {
      const g = await oracle.read.guardian();
      assert.equal(getAddress(g), getAddress(guardian.account.address));
    });

    it("records a CLEAR verdict", async () => {
      await oracle.write.recordVerdict([
        mockToken.address, CLEAR, 0, 100, 100, 50, 10, "All guards pass",
      ]);
      assert.equal(await oracle.read.getCurrentVerdict([mockToken.address]), CLEAR);
      assert.equal(await oracle.read.isHalted([mockToken.address]), false);
      assert.equal(await oracle.read.isClear([mockToken.address]), true);
    });

    it("records a HALT verdict", async () => {
      await oracle.write.recordVerdict([
        mockToken.address, HALT, 3, 1300, 260, 25, 60, "Drawdown 13%",
      ]);
      assert.equal(await oracle.read.isHalted([mockToken.address]), true);
      const stats = await oracle.read.assetStats([mockToken.address]);
      assert.equal(stats[0], 1n);
    });

    it("tracks verdict history", async () => {
      for (let i = 0; i < 3; i++) {
        await oracle.write.recordVerdict([
          mockToken.address, CAUTION, 2, 800, 160, 74, 30, `Cycle ${i}`,
        ]);
      }
      const hist = await oracle.read.getHistory([mockToken.address]);
      assert.equal(hist.length, 3);
    });

    it("rejects non-guardian callers", async () => {
      await assert.rejects(() =>
        writeAs(oracle, "recordVerdict", [
          mockToken.address, HALT, 31, 1500, 300, 20, 100, "hack",
        ], attacker)
      );
    });
  });


  describe("ThreatRegistry", () => {

    it("accepts a threat report", async () => {
      await writeAs(registry, "reportThreat", [ASSET, 80, 2, "Honeypot"], user1);
      assert.equal(await registry.read.getAggregateThreatScore([ASSET]), 80);
    });

    it("auto-verifies when score >= 75", async () => {
      await writeAs(registry, "reportThreat", [ASSET, 80, 3, "Rug pull"], user1);
      assert.equal(await registry.read.isVerifiedThreat([ASSET]), true);
    });

    it("does not verify below threshold", async () => {
      await writeAs(registry, "reportThreat", [ASSET, 50, 0, "Suspicious"], user1);
      assert.equal(await registry.read.isVerifiedThreat([ASSET]), false);
    });

    it("prevents double upvoting", async () => {
      await writeAs(registry, "reportThreat", [ASSET, 60, 1, "Malicious"], user1);
      await writeAs(registry, "upvoteReport", [ASSET, 0n], user2);
      await assert.rejects(() =>
        writeAs(registry, "upvoteReport", [ASSET, 0n], user2)
      );
    });

    it("guardian can clear a threat", async () => {
      await writeAs(registry, "reportThreat", [ASSET, 80, 3, "Rug"], user1);
      assert.equal(await registry.read.isVerifiedThreat([ASSET]), true);
      // guardian = wallets[0] = default sender
      await registry.write.clearThreat([ASSET]);
      assert.equal(await registry.read.isVerifiedThreat([ASSET]), false);
    });
  });


  describe("GuardianVault", () => {

    beforeEach(async () => {
      // user1 enables protection
      await writeAs(vault, "enableProtection", [], user1);

      // user1 approves vault
      await writeAs(mockToken, "approve", [
        vault.address, parseUnits("10000", 18),
      ], user1);

      // guardian sets HALT on oracle (wallets[0] = default sender)
      await oracle.write.recordVerdict([
        mockToken.address, HALT, 3, 1300, 260, 25, 60, "Test halt",
      ]);
    });

    it("enables protection", async () => {
      assert.equal(await vault.read.isProtected([user1.account.address]), true);
    });

    it("disables protection", async () => {
      await writeAs(vault, "disableProtection", [], user1);
      assert.equal(await vault.read.isProtected([user1.account.address]), false);
    });

    it("guardian protects tokens on HALT", async () => {
      const AMOUNT = parseUnits("100", 18);
      await vault.write.protectTokens([
        user1.account.address, mockToken.address, AMOUNT, "HALT triggered",
      ]);
      const bal = await vault.read.getVaultBalance([
        user1.account.address, mockToken.address,
      ]);
      assert.equal(bal, AMOUNT);
    });

    it("user withdraws protected tokens", async () => {
      const AMOUNT = parseUnits("100", 18);
      await vault.write.protectTokens([
        user1.account.address, mockToken.address, AMOUNT, "Test",
      ]);
      const before = await mockToken.read.balanceOf([user1.account.address]);
      await writeAs(vault, "withdraw", [mockToken.address], user1);
      const after  = await mockToken.read.balanceOf([user1.account.address]);
      assert.equal(after - before, AMOUNT);
    });

    it("enforces cooldown", async () => {
      const AMOUNT = parseUnits("50", 18);
      await vault.write.protectTokens([
        user1.account.address, mockToken.address, AMOUNT, "First",
      ]);
      await assert.rejects(() =>
        vault.write.protectTokens([
          user1.account.address, mockToken.address, AMOUNT, "Too fast",
        ])
      );
    });

    it("rejects non-guardian callers", async () => {
      const AMOUNT = parseUnits("100", 18);
      await assert.rejects(() =>
        writeAs(vault, "protectTokens", [
          user1.account.address, mockToken.address, AMOUNT, "hack",
        ], attacker)
      );
    });

    it("rejects unregistered user", async () => {
      const AMOUNT = parseUnits("100", 18);
      await assert.rejects(() =>
        vault.write.protectTokens([
          user2.account.address, mockToken.address, AMOUNT, "unregistered",
        ])
      );
    });
  });
});
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";
import { defineConfig } from "hardhat/config";
import dotenv           from "dotenv";

dotenv.config();

export default defineConfig({
  plugins: [hardhatToolboxViem],

  solidity: {
    profiles: {
      default:    { version: "0.8.28" },
      production: {
        version: "0.8.28",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
    },
  },

  networks: {
    hardhat: { type: "edr-simulated", chainType: "l1" },

    arcTestnet: {
      type: "http",
      chainType: "l1",
      url: process.env.ARC_RPC_URL ?? process.env.RPC ?? "https://rpc.testnet.arc.network",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },

  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
});
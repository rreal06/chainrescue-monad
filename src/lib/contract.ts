import { defineChain } from "viem";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [import.meta.env.VITE_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"] }
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" }
  },
  testnet: true
});

export const chainRescueAbi = [
  {
    type: "function",
    name: "getTaskCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "getTask",
    stateMutability: "view",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "category", type: "uint8" },
          { name: "description", type: "string" },
          { name: "fictionalArea", type: "string" },
          { name: "creator", type: "address" },
          { name: "createdAt", type: "uint64" },
          { name: "status", type: "uint8" },
          { name: "assignedVolunteer", type: "address" },
          { name: "verifierOne", type: "address" },
          { name: "verifierTwo", type: "address" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "createTask",
    stateMutability: "nonpayable",
    inputs: [
      { name: "category", type: "uint8" },
      { name: "description", type: "string" },
      { name: "fictionalArea", type: "string" }
    ],
    outputs: [{ name: "taskId", type: "uint256" }]
  },
  {
    type: "function",
    name: "claimTask",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "reportCompletion",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "verifyTask",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "authorizedVerifiers",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }]
  }
] as const;

export const CATEGORIES = ["Tıbbi", "Barınma", "Malzeme", "Ulaşım", "Diğer"] as const;
export const STATUSES = ["OPEN", "CLAIMED", "REPORTED", "VERIFIED"] as const;
export const STATUS_LABELS = {
  OPEN: "AÇIK",
  CLAIMED: "ÜSTLENİLDİ",
  REPORTED: "BİLDİRİLDİ",
  VERIFIED: "DOĞRULANDI"
} as const;

export type Category = (typeof CATEGORIES)[number];
export type TaskStatus = (typeof STATUSES)[number];

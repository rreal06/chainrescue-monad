import type { Address } from "viem";
import type { Category, TaskStatus } from "./contract";

export interface RescueTask {
  id: number;
  category: Category;
  description: string;
  fictionalArea: string;
  creator: Address;
  createdAt: Date;
  status: TaskStatus;
  assignedVolunteer?: Address;
  verifierOne?: Address;
  verifierTwo?: Address;
  source: "onchain" | "demo-example";
}

const demoAddress = (tail: string) => `0x000000000000000000000000000000000000${tail}` as Address;

export const DEMO_TASKS: RescueTask[] = [
  {
    id: 101,
    category: "Malzeme",
    description: "Kurgusal destek noktasına içme suyu ulaştırın.",
    fictionalArea: "Demo Bölgesi A",
    creator: demoAddress("0a11"),
    createdAt: new Date("2026-10-23T08:15:00Z"),
    status: "OPEN",
    source: "demo-example"
  },
  {
    id: 102,
    category: "Ulaşım",
    description: "Kurgusal hareketlilik kitlerini depodan kliniğe taşıyın.",
    fictionalArea: "Kuzey Tatbikat Alanı",
    creator: demoAddress("0a12"),
    createdAt: new Date("2026-10-23T09:30:00Z"),
    status: "CLAIMED",
    assignedVolunteer: demoAddress("0b21"),
    source: "demo-example"
  },
  {
    id: 103,
    category: "Barınma",
    description: "Kurgusal geçici barınaktaki uygunluğu inceleyin.",
    fictionalArea: "Sivil Tatbikat Alanı",
    creator: demoAddress("0a13"),
    createdAt: new Date("2026-10-23T10:00:00Z"),
    status: "REPORTED",
    assignedVolunteer: demoAddress("0b22"),
    verifierOne: demoAddress("0c31"),
    source: "demo-example"
  },
  {
    id: 104,
    category: "Tıbbi",
    description: "Tatbikat sonrası kurgusal ilk yardım istasyonunu yenileyin.",
    fictionalArea: "Eğitim Meydanı 4",
    creator: demoAddress("0a14"),
    createdAt: new Date("2026-10-23T11:20:00Z"),
    status: "VERIFIED",
    assignedVolunteer: demoAddress("0b23"),
    verifierOne: demoAddress("0c32"),
    verifierTwo: demoAddress("0c33"),
    source: "demo-example"
  }
];

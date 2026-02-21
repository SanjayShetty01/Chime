import { CardConfig } from "@/types";

// Add a new card by adding one object to this array
export const SUPPORTED_CARDS: CardConfig[] = [
  {
    id: "hdfc-millennia",
    name: "Millennia",
    bank: "HDFC",
    color: "210 80% 45%",
    icon: "💳",
  },
  {
    id: "hdfc-moneyback-plus",
    name: "MoneyBack+",
    bank: "HDFC",
    color: "210 80% 45%",
    icon: "💰",
  },
  {
    id: "sbi-cashback",
    name: "CashBack",
    bank: "SBI",
    color: "220 70% 40%",
    icon: "🏦",
  },
  {
    id: "axis-ace",
    name: "ACE",
    bank: "Axis",
    color: "340 65% 47%",
    icon: "🃏",
  },
  {
    id: "amazon-pay-icici",
    name: "Amazon Pay",
    bank: "ICICI",
    color: "30 90% 50%",
    icon: "📦",
  },
  {
    id: "icici-amazon-business",
    name: "Amazon Business",
    bank: "ICICI",
    color: "30 90% 50%",
    icon: "🏢",
  },
  {
    id: "au-lit",
    name: "LIT",
    bank: "AU Small Finance",
    color: "15 85% 55%",
    icon: "🔥",
  },
  {
    id: "onecard",
    name: "OneCard",
    bank: "OneCard",
    color: "0 0% 15%",
    icon: "⚡",
  },
];

export const getCardById = (id: string): CardConfig | undefined =>
  SUPPORTED_CARDS.find((c) => c.id === id);

// Group cards by bank for the selector UI
export const getCardsByBank = (): Record<string, CardConfig[]> =>
  SUPPORTED_CARDS.reduce(
    (acc, card) => {
      if (!acc[card.bank]) acc[card.bank] = [];
      acc[card.bank].push(card);
      return acc;
    },
    {} as Record<string, CardConfig[]>,
  );

import { CardConfig } from "@/types";

// Group cards by bank for the selector UI
export const getCardsByBank = (cards: CardConfig[]): Record<string, CardConfig[]> =>
  cards.reduce(
    (acc, card) => {
      if (!acc[card.bank]) acc[card.bank] = [];
      acc[card.bank].push(card);
      return acc;
    },
    {} as Record<string, CardConfig[]>,
  );

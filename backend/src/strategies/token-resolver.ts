import type { SlotInfo } from "./types";

export type BinarySide = "UP" | "DOWN";

export function resolveBinaryTokenId(slot: SlotInfo, side: BinarySide): string | null {
  if (side === "UP") return slot.upTokenId ?? null;
  return slot.downTokenId ?? null;
}

import type { EventTone } from "../types";

export function eventToneClass(tone: EventTone): string {
  if (tone === "green") return "bg-kreis-forest";
  if (tone === "orange") return "bg-kreis-orange";
  if (tone === "beige") return "bg-kreis-beige";
  return "bg-kreis-pumpkin";
}

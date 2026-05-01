import type { EventTone } from "../types";

export function eventToneClass(tone: EventTone): string {
  if (tone === "green") return "is-green";
  if (tone === "orange") return "is-orange";
  if (tone === "beige") return "is-beige";
  return "";
}

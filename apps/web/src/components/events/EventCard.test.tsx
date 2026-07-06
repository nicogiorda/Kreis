import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { KreisEvent } from "../../types";
import { EventCard } from "./EventCard";

const event: KreisEvent = {
  id: "event-1",
  title: "Encuentro de estudiantes",
  date: "2026-07-10",
  day: "10",
  month: "JUL",
  place: "Campus UADE",
  category: "Social",
  topics: [],
  icon: "",
  tone: "orange",
  interested: false,
  description: "Una actividad para conocer estudiantes."
};

describe("EventCard", () => {
  it.each(["full", "compact"] as const)(
    "opens the event from the complete %s card",
    (variant) => {
      const onOpenEventDetails = vi.fn();

      render(
        <EventCard
          event={event}
          variant={variant}
          onOpenEventDetails={onOpenEventDetails}
        />
      );

      const card = screen.getByRole("button", {
        name: `Ver detalles de ${event.title}`
      });

      fireEvent.click(card);

      expect(onOpenEventDetails).toHaveBeenCalledOnce();
      expect(onOpenEventDetails).toHaveBeenCalledWith(event.id);
      expect(screen.getAllByRole("button")).toHaveLength(1);
    }
  );
});

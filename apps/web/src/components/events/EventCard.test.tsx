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
  it("opens the event from the complete full card", () => {
    const onOpenEventDetails = vi.fn();

    render(
      <EventCard
        event={event}
        variant="full"
        onOpenEventDetails={onOpenEventDetails}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: `Ver detalles de ${event.title}`
      })
    );

    expect(onOpenEventDetails).toHaveBeenCalledOnce();
    expect(onOpenEventDetails).toHaveBeenCalledWith(event.id);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("keeps the compact home card arrow as its entry point", () => {
    const onOpenEventDetails = vi.fn();

    render(
      <EventCard
        event={event}
        variant="compact"
        onOpenEventDetails={onOpenEventDetails}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: `Ver detalles de ${event.title}`
      })
    );

    expect(onOpenEventDetails).toHaveBeenCalledOnce();
    expect(onOpenEventDetails).toHaveBeenCalledWith(event.id);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});

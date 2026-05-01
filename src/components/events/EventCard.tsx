import { Meta } from "../common/Meta";
import { eventToneClass } from "../../utils/events";
import type { KreisEvent } from "../../types";

type EventCardProps = {
  event: KreisEvent;
  variant?: "full" | "compact";
  onOpenEvents?: () => void;
  onToggleInterest?: (eventId: string) => void;
};

export function EventCard({ event, variant = "full", onOpenEvents, onToggleInterest }: EventCardProps) {
  const compact = variant === "compact";

  if (compact) {
    return (
      <article className="event-card card is-compact" onClick={onOpenEvents}>
        <div className="event-compact-date">
          <strong>{event.day}</strong>
          <span>{event.month}</span>
        </div>
        <div className="event-compact-body">
          <h3>{event.title}</h3>
          <Meta items={[event.date, event.place]} />
        </div>
      </article>
    );
  }

  return (
    <article className="event-card card">
      <div className={`event-media ${eventToneClass(event.tone)}`}>
        <span className="media-icon">{event.icon}</span>
      </div>
      <div className="event-content">
        <div>
          <h3>{event.title}</h3>
          <p className="muted">{event.description}</p>
          <Meta items={[event.date, event.place]} />
        </div>
        <div className="event-footer">
          <span className="date-badge">
            <strong>{event.day}</strong>
            <span>{event.month}</span>
          </span>
          <button className={`interest-button ${event.interested ? "is-selected" : ""}`} type="button" onClick={() => onToggleInterest?.(event.id)}>
            {event.interested ? "Anotado" : "Me interesa"}
          </button>
        </div>
      </div>
    </article>
  );
}

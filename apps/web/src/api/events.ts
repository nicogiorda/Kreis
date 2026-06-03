import type { EventTone, KreisEvent } from "../types";
import { normalize } from "../utils/text";
import { bearerTokenHeaders, requestJson } from "./client";

type EventTopic = {
  id_topico: string;
  topico: string;
};

type EventSummary = {
  id_evento: string;
  nombre: string;
  ubicacion: string | null;
  fecha_inicio: string;
  descripcion: string | null;
  imagen_url?: string | null;
  topicos: EventTopic[];
  interested: boolean;
};

type EventDetail = EventSummary & {
  creador: {
    nombre: string;
    apellido: string;
  };
};

type EventInterestResponse = {
  interest: {
    id_evento: string;
    interested: boolean;
  };
};

type CreatePendingEventInput = {
  title: string;
  date: string;
  place: string;
  topicIds: string[];
  description: string;
  imageUrl?: string;
};

const argentinaTimezone = "America/Argentina/Buenos_Aires";
const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: argentinaTimezone,
  weekday: "short",
  day: "2-digit",
  month: "short"
});
const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: argentinaTimezone,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

function getDatePart(date: Date, type: Intl.DateTimeFormatPartTypes): string {
  return dateFormatter.formatToParts(date).find((part) => part.type === type)?.value ?? "";
}

function getEventIcon(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

function getEventTone(category: string): EventTone {
  const normalizedCategory = normalize(category);

  if (normalizedCategory === "deporte" || normalizedCategory === "tecnologia") return "green";
  if (normalizedCategory === "arte" || normalizedCategory === "entretenimiento") return "pumpkin";

  return "orange";
}

function adaptEvent(event: EventSummary): KreisEvent {
  const startDate = new Date(event.fecha_inicio);
  const day = getDatePart(startDate, "day");
  const month = getDatePart(startDate, "month").replace(".", "").toUpperCase();
  const weekday = getDatePart(startDate, "weekday").replace(".", "");
  const topics = event.topicos.map((topic) => ({
    id: topic.id_topico,
    name: topic.topico
  }));
  const category = topics[0]?.name ?? "General";
  const official = event.topicos.some((topic) => normalize(topic.topico) === "academico");

  return {
    id: event.id_evento,
    title: event.nombre,
    date: `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day} ${month}`,
    day,
    month,
    place: event.ubicacion ?? "Ubicacion a confirmar",
    category,
    topics,
    icon: getEventIcon(event.nombre),
    tone: getEventTone(category),
    interested: event.interested,
    description: event.descripcion ?? "Todavia no hay una descripcion para este evento.",
    time: timeFormatter.format(startDate),
    official,
    imageUrl: event.imagen_url ?? undefined
  };
}

function adaptEventDetail(event: EventDetail): KreisEvent {
  const adaptedEvent = adaptEvent(event);

  return {
    ...adaptedEvent,
    detailDescription: adaptedEvent.description,
    organizer: adaptedEvent.official
      ? "UADE"
      : `${event.creador.nombre} ${event.creador.apellido}`.trim()
  };
}

export async function listUpcomingEvents(accessToken: string, signal?: AbortSignal): Promise<KreisEvent[]> {
  const response = await requestJson<{ events: EventSummary[] }>("/api/v1/events/accepted/summary/limit", {
    headers: bearerTokenHeaders(accessToken),
    signal
  });

  return response.events.map(adaptEvent);
}

export async function listAllEvents(accessToken: string, signal?: AbortSignal): Promise<KreisEvent[]> {
  const response = await requestJson<{ events: EventSummary[] }>("/api/v1/events/accepted/summary/all", {
    headers: bearerTokenHeaders(accessToken),
    signal
  });

  return response.events.map(adaptEvent);
}

export async function getEventDetail(eventId: string, accessToken: string, signal?: AbortSignal): Promise<KreisEvent> {
  const response = await requestJson<{ event: EventDetail }>(`/api/v1/events/${encodeURIComponent(eventId)}`, {
    headers: bearerTokenHeaders(accessToken),
    signal
  });

  return adaptEventDetail(response.event);
}

export async function toggleEventInterest(eventId: string, accessToken: string): Promise<boolean> {
  const response = await requestJson<EventInterestResponse>(`/api/v1/events/${encodeURIComponent(eventId)}/interes`, {
    method: "POST",
    headers: bearerTokenHeaders(accessToken)
  });

  return response.interest.interested;
}

export async function createPendingEvent(input: CreatePendingEventInput, accessToken: string): Promise<void> {
  const startDateTime = input.date.includes("T") ? input.date : `${input.date}T09:00:00`;

  await requestJson("/api/v1/events", {
    method: "POST",
    headers: bearerTokenHeaders(accessToken),
    body: JSON.stringify({
      nombre: input.title,
      ubicacion: input.place,
      fecha_inicio: startDateTime,
      descripcion: input.description,
      imagen_url: input.imageUrl,
      topicos: input.topicIds.map(Number)
    })
  });
}

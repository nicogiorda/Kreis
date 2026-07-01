import { User } from "@phosphor-icons/react";
import {
  AddCircle,
  AltArrowRight,
  CalendarMinimalistic,
  CheckCircle,
  CloseCircle,
  Flag,
  ForbiddenCircle,
  Logout2,
  Magnifier,
  MapPoint,
  Settings,
  TrashBinMinimalistic,
  UserCircle,
  UsersGroupRounded
} from "@solar-icons/react";
import { useEffect, useMemo, useState } from "react";
import {
  deleteAdminUser,
  listAdminCommunities,
  listAdminEvents,
  listAdminReports,
  listAdminUsers,
  updateAdminCommunityStatus,
  updateAdminEventStatus,
  updateAdminReportStatus,
  type AdminCommunity,
  type AdminEvent,
  type AdminPublicationStatus,
  type AdminReport,
  type AdminReportStatus,
  type AdminUser
} from "../../api/admin";
import type { Community, KreisEvent } from "../../types";
import { cn } from "../../utils/cn";
import { LoadingState } from "../common/LoadingState";
import { groupAdminReports, type AdminReportCase } from "./report-cases";

type AdminSection = "communities" | "events" | "users" | "reports";
type CommunityView = "requests" | "approved";
type EventView = "requests" | "published";
type ReportView = "incoming" | "resolved";
type ResourceStatus = "loading" | "ready" | "error";

type AdminDashboardProps = {
  accessToken: string;
  profileEmail?: string;
  communities: Community[];
  events: KreisEvent[];
  refreshKey?: number;
  onBack: () => void;
  onCreateEvent: () => void;
};

type CommunityReview = {
  id: string;
  name: string;
  author: string;
  topics: string[];
  description: string;
  members?: number;
  pending: boolean;
};

type EventReview = {
  id: string;
  title: string;
  day: string;
  month: string;
  place: string;
  description: string;
  imageUrl: string | null;
  creator: string;
  startsAt: string;
  pending: boolean;
};

const adminSections = [
  { id: "communities", label: "Comunidades", Icon: UsersGroupRounded },
  { id: "events", label: "Eventos", Icon: CalendarMinimalistic },
  { id: "users", label: "Usuarios", Icon: UserCircle },
  { id: "reports", label: "Reportes", Icon: Flag }
] satisfies Array<{ id: AdminSection; label: string; Icon: typeof UsersGroupRounded }>;

const initialResourceStatus: Record<AdminSection, ResourceStatus> = {
  communities: "loading",
  events: "loading",
  users: "loading",
  reports: "loading"
};

const argentinaDateFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit",
  month: "short"
});

const argentinaDetailDateFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  dateStyle: "medium",
  timeStyle: "short"
});

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "No pudimos completar la acción.";
}

function formatEventDate(startsAt: string): { day: string; month: string } {
  const date = new Date(startsAt);
  const parts = argentinaDateFormatter.formatToParts(date);

  return {
    day: parts.find((part) => part.type === "day")?.value ?? "--",
    month: (parts.find((part) => part.type === "month")?.value ?? "---").replace(".", "").toUpperCase()
  };
}

function formatReportAge(createdAt: string): string {
  const elapsedMs = Date.now() - new Date(createdAt).getTime();
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60_000));

  if (elapsedMinutes < 1) return "Ahora";
  if (elapsedMinutes < 60) return `Hace ${elapsedMinutes} min`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `Hace ${elapsedHours} h`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `Hace ${elapsedDays} ${elapsedDays === 1 ? "día" : "días"}`;
}

function mapPendingCommunity(community: AdminCommunity): CommunityReview {
  return {
    id: community.id,
    name: community.name,
    author: community.creator?.name ?? "Usuario Kreis",
    topics: community.topics,
    description: community.description,
    pending: true
  };
}

function mapApprovedCommunity(community: Community): CommunityReview {
  return {
    id: community.id,
    name: community.name,
    author: "Comunidad de Kreis",
    topics: community.topics?.map((topic) => topic.name) ?? [community.category],
    description: community.description ?? community.pulse,
    members: community.members,
    pending: false
  };
}

function mapPendingEvent(event: AdminEvent): EventReview {
  const { day, month } = formatEventDate(event.startsAt);

  return {
    id: event.id,
    title: event.name,
    day,
    month,
    place: event.place,
    description: event.description,
    imageUrl: event.imageUrl,
    creator: event.creator.name,
    startsAt: event.startsAt,
    pending: true
  };
}

function mapPublishedEvent(event: KreisEvent): EventReview {
  return {
    id: event.id,
    title: event.title,
    day: event.day,
    month: event.month,
    place: event.place,
    description: event.description,
    imageUrl: event.imageUrl ?? null,
    creator: event.organizer ?? "Kreis",
    startsAt: `${event.date} ${event.time ?? ""}`.trim(),
    pending: false
  };
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="admin-segmented-control" role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          className={cn(value === option.value && "is-active")}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          key={option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function AdminResourceState({
  status,
  emptyMessage,
  hasItems,
  onRetry
}: {
  status: ResourceStatus;
  emptyMessage: string;
  hasItems: boolean;
  onRetry: () => void;
}) {
  if (status === "loading") {
    return <LoadingState className="admin-resource-loading" label="Cargando administración" />;
  }

  if (status === "error") {
    return (
      <div className="admin-resource-error" role="alert">
        <p>No pudimos cargar esta sección.</p>
        <button type="button" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    );
  }

  return !hasItems ? <p className="admin-empty-state">{emptyMessage}</p> : null;
}

function CommunityCard({
  community,
  busyAction,
  onApprove,
  onReject
}: {
  community: CommunityReview;
  busyAction: string | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  const approving = busyAction === `community:${community.id}:Aceptado`;
  const rejecting = busyAction === `community:${community.id}:Rechazado`;

  return (
    <article className="admin-community-card">
      <div className="admin-community-card__heading">
        <div>
          <h2>{community.name}</h2>
          <p>{community.author}</p>
        </div>
        {community.pending ? (
          <div className="admin-community-card__actions">
            <button className="is-approve" type="button" disabled={Boolean(busyAction)} onClick={onApprove}>
              {approving ? (
                <LoadingState variant="button" label="Aceptando" />
              ) : (
                <CheckCircle size={11} weight="Linear" aria-hidden="true" />
              )}
              {!approving ? "Aceptar" : null}
            </button>
            <button className="is-reject" type="button" disabled={Boolean(busyAction)} onClick={onReject}>
              {rejecting ? (
                <LoadingState variant="button" label="Rechazando" />
              ) : (
                <CloseCircle size={11} weight="Linear" aria-hidden="true" />
              )}
              {!rejecting ? "Rechazar" : null}
            </button>
          </div>
        ) : (
          <span className="admin-community-card__members">{community.members ?? 0} miembros</span>
        )}
      </div>
      <div className="admin-community-card__topics">
        {community.topics.slice(0, 2).map((topic) => (
          <span key={topic}>{topic}</span>
        ))}
      </div>
      <p className="admin-community-card__description">{community.description}</p>
    </article>
  );
}

function CommunitiesPanel({
  accessToken,
  pendingCommunities,
  approvedCommunities,
  status,
  onRetry,
  onUpdated,
  onError
}: {
  accessToken: string;
  pendingCommunities: AdminCommunity[];
  approvedCommunities: CommunityReview[];
  status: ResourceStatus;
  onRetry: () => void;
  onUpdated: (community: AdminCommunity, nextStatus: AdminPublicationStatus) => void;
  onError: (message: string) => void;
}) {
  const [view, setView] = useState<CommunityView>("requests");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const visible = view === "requests" ? pendingCommunities.map(mapPendingCommunity) : approvedCommunities;

  async function updateStatus(community: AdminCommunity, nextStatus: AdminPublicationStatus): Promise<void> {
    const actionId = `community:${community.id}:${nextStatus}`;
    setBusyAction(actionId);
    onError("");

    try {
      await updateAdminCommunityStatus(community.id, nextStatus, accessToken);
      onUpdated(community, nextStatus);
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <>
      <SegmentedControl
        value={view}
        label="Estado de comunidades"
        options={[
          { value: "requests", label: "Solicitudes" },
          { value: "approved", label: "Comunidades" }
        ]}
        onChange={setView}
      />
      <div className="admin-community-list">
        {visible.map((community) => {
          const source = pendingCommunities.find((item) => item.id === community.id);

          return (
            <CommunityCard
              community={community}
              busyAction={busyAction}
              key={community.id}
              onApprove={() => source && void updateStatus(source, "Aceptado")}
              onReject={() => source && void updateStatus(source, "Rechazado")}
            />
          );
        })}
        <AdminResourceState
          status={view === "requests" ? status : "ready"}
          hasItems={visible.length > 0}
          emptyMessage={view === "requests" ? "No hay solicitudes pendientes." : "No hay comunidades aprobadas."}
          onRetry={onRetry}
        />
      </div>
    </>
  );
}

function EventCard({ event, onOpen }: { event: EventReview; onOpen: () => void }) {
  return (
    <button className="admin-event-card" type="button" onClick={onOpen}>
      <span className="admin-event-card__date" aria-label={`${event.day} ${event.month}`}>
        <strong>{event.day}</strong>
        <span>{event.month}</span>
      </span>
      <span className="admin-event-card__content">
        <h2>{event.title}</h2>
        <span className="admin-event-card__place">
          <MapPoint size={10} weight="Linear" aria-hidden="true" />
          {event.place}
        </span>
      </span>
      <AltArrowRight className="admin-event-card__arrow" size={15} weight="Linear" aria-hidden="true" />
    </button>
  );
}

function EventsPanel({
  accessToken,
  pendingEvents,
  publishedEvents,
  status,
  onCreateEvent,
  onRetry,
  onUpdated,
  onError
}: {
  accessToken: string;
  pendingEvents: AdminEvent[];
  publishedEvents: EventReview[];
  status: ResourceStatus;
  onCreateEvent: () => void;
  onRetry: () => void;
  onUpdated: (event: AdminEvent, nextStatus: AdminPublicationStatus) => void;
  onError: (message: string) => void;
}) {
  const [view, setView] = useState<EventView>("requests");
  const [selectedEvent, setSelectedEvent] = useState<EventReview | null>(null);
  const [busyStatus, setBusyStatus] = useState<AdminPublicationStatus | null>(null);
  const visible = view === "requests" ? pendingEvents.map(mapPendingEvent) : publishedEvents;

  async function updateStatus(nextStatus: AdminPublicationStatus): Promise<void> {
    if (!selectedEvent) return;
    const source = pendingEvents.find((event) => event.id === selectedEvent.id);
    if (!source) return;

    setBusyStatus(nextStatus);
    onError("");

    try {
      await updateAdminEventStatus(source.id, nextStatus, accessToken);
      onUpdated(source, nextStatus);
      setSelectedEvent(null);
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setBusyStatus(null);
    }
  }

  return (
    <>
      <div className="admin-title-row">
        <h1>Eventos</h1>
        <button className="admin-create-event" type="button" onClick={onCreateEvent}>
          <AddCircle size={14} weight="Linear" aria-hidden="true" />
          Crear evento
        </button>
      </div>
      <SegmentedControl
        value={view}
        label="Estado de eventos"
        options={[
          { value: "requests", label: "Solicitudes" },
          { value: "published", label: "Eventos" }
        ]}
        onChange={setView}
      />
      <div className="admin-event-list">
        {visible.map((event) => (
          <EventCard event={event} key={event.id} onOpen={() => setSelectedEvent(event)} />
        ))}
        <AdminResourceState
          status={view === "requests" ? status : "ready"}
          hasItems={visible.length > 0}
          emptyMessage={view === "requests" ? "No hay eventos pendientes." : "No hay eventos publicados."}
          onRetry={onRetry}
        />
      </div>

      {selectedEvent ? (
        <div className="admin-report-dialog-backdrop" role="presentation" onClick={() => setSelectedEvent(null)}>
          <section
            className="admin-report-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-event-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="admin-report-dialog__close"
              type="button"
              aria-label="Cerrar detalle"
              onClick={() => setSelectedEvent(null)}
            >
              <CloseCircle size={24} weight="Linear" />
            </button>
            {selectedEvent.imageUrl ? (
              <div className="admin-event-dialog-cover">
                <img src={selectedEvent.imageUrl} alt="" loading="lazy" decoding="async" />
              </div>
            ) : null}
            <span>{selectedEvent.pending ? "Evento pendiente" : "Evento publicado"}</span>
            <h2 id="admin-event-title">{selectedEvent.title}</h2>
            <p>{selectedEvent.description}</p>
            <dl>
              <div>
                <dt>Organiza</dt>
                <dd>{selectedEvent.creator}</dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>
                  {selectedEvent.pending
                    ? argentinaDetailDateFormatter.format(new Date(selectedEvent.startsAt))
                    : selectedEvent.startsAt}
                </dd>
              </div>
              <div>
                <dt>Lugar</dt>
                <dd>{selectedEvent.place}</dd>
              </div>
            </dl>
            {selectedEvent.pending ? (
              <div className="admin-dialog-actions">
                <button
                  className="is-secondary"
                  type="button"
                  disabled={Boolean(busyStatus)}
                  onClick={() => void updateStatus("Rechazado")}
                >
                  {busyStatus === "Rechazado" ? <LoadingState variant="button" label="Rechazando" /> : "Rechazar"}
                </button>
                <button
                  className="is-primary"
                  type="button"
                  disabled={Boolean(busyStatus)}
                  onClick={() => void updateStatus("Aceptado")}
                >
                  {busyStatus === "Aceptado" ? <LoadingState variant="button" label="Publicando" /> : "Publicar"}
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}

function UsersPanel({
  accessToken,
  users,
  status,
  onRetry,
  onDeleted,
  onError
}: {
  accessToken: string;
  users: AdminUser[];
  status: ResourceStatus;
  onRetry: () => void;
  onDeleted: (legajo: number) => void;
  onError: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [deletingLegajo, setDeletingLegajo] = useState<number | null>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const visibleUsers = users.filter((user) =>
    `${user.name} ${user.email}`.toLocaleLowerCase("es").includes(normalizedQuery)
  );

  async function deleteUser(user: AdminUser): Promise<void> {
    const confirmed = window.confirm(
      `¿Eliminar definitivamente a ${user.name}? También se eliminará su contenido relacionado.`
    );
    if (!confirmed) return;

    setDeletingLegajo(user.legajo);
    onError("");

    try {
      await deleteAdminUser(user.legajo, accessToken);
      onDeleted(user.legajo);
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setDeletingLegajo(null);
    }
  }

  return (
    <>
      <label className="admin-user-search">
        <Magnifier size={17} weight="Linear" aria-hidden="true" />
        <input
          type="search"
          value={query}
          placeholder="Buscar un usuario"
          aria-label="Buscar un usuario"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="admin-user-list">
        {visibleUsers.map((user) => (
          <article className="admin-user-card" key={user.legajo}>
            <div className="admin-user-card__avatar" aria-hidden="true">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <User size={27} weight="fill" aria-hidden="true" />}
            </div>
            <div className="admin-user-card__identity">
              <h2>{user.name}</h2>
              <p>{user.email}</p>
            </div>
            <button type="button" disabled={deletingLegajo !== null} onClick={() => void deleteUser(user)}>
              {deletingLegajo === user.legajo ? (
                <LoadingState variant="button" label="Eliminando" />
              ) : (
                <TrashBinMinimalistic size={12} weight="Linear" aria-hidden="true" />
              )}
              {deletingLegajo !== user.legajo ? "Eliminar" : null}
            </button>
          </article>
        ))}
        <AdminResourceState
          status={status}
          hasItems={visibleUsers.length > 0}
          emptyMessage={normalizedQuery ? "No encontramos usuarios." : "No hay usuarios disponibles."}
          onRetry={onRetry}
        />
      </div>
    </>
  );
}

function ReportsPanel({
  accessToken,
  reports,
  status,
  onRetry,
  onUpdated,
  onError
}: {
  accessToken: string;
  reports: AdminReport[];
  status: ResourceStatus;
  onRetry: () => void;
  onUpdated: (reports: AdminReport[]) => void;
  onError: (message: string) => void;
}) {
  const [view, setView] = useState<ReportView>("incoming");
  const [selectedCase, setSelectedCase] = useState<AdminReportCase | null>(null);
  const [busyStatus, setBusyStatus] = useState<AdminReportStatus | null>(null);
  const reportCases = useMemo(() => groupAdminReports(reports), [reports]);
  const visibleCases = reportCases.filter((reportCase) =>
    view === "incoming"
      ? reportCase.representative.status === "Pendiente"
      : reportCase.representative.status !== "Pendiente"
  );

  async function updateStatus(nextStatus: AdminReportStatus): Promise<void> {
    if (!selectedCase) return;

    if (
      nextStatus === "Resuelto" &&
      !window.confirm(
        `Resolver este caso eliminará el contenido original y cerrará ${selectedCase.reportCount} ${
          selectedCase.reportCount === 1 ? "reporte" : "reportes"
        }. ¿Continuar?`
      )
    ) {
      return;
    }

    setBusyStatus(nextStatus);
    onError("");

    try {
      const updated = await updateAdminReportStatus(
        selectedCase.representative.id,
        nextStatus,
        accessToken
      );
      onUpdated(updated);
      setSelectedCase(null);
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setBusyStatus(null);
    }
  }

  return (
    <>
      <SegmentedControl
        value={view}
        label="Estado de reportes"
        options={[
          { value: "incoming", label: "Entrantes" },
          { value: "resolved", label: "Resueltos" }
        ]}
        onChange={setView}
      />
      <div className="admin-report-list">
        {visibleCases.map((reportCase) => {
          const report = reportCase.representative;
          const targetLabel = report.targetType === "Post" ? "Post" : "Comentario";

          return (
            <article className="admin-report-card" key={reportCase.id}>
              <div>
                <div className="admin-report-card__title">
                  <h2>{reportCase.reportCount > 1 ? `${targetLabel} reportado` : report.reason}</h2>
                  {reportCase.reportCount > 1 ? <span>{reportCase.reportCount}</span> : null}
                </div>
                <p>
                  {reportCase.reportCount > 1
                    ? `${reportCase.reasons.length} ${
                        reportCase.reasons.length === 1 ? "motivo" : "motivos"
                      } · `
                    : ""}
                  {report.community?.name ?? "Contenido eliminado"} · {formatReportAge(report.createdAt)}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedCase(reportCase)}>
                Ver detalle
              </button>
            </article>
          );
        })}
        <AdminResourceState
          status={status}
          hasItems={visibleCases.length > 0}
          emptyMessage={view === "incoming" ? "No hay reportes pendientes." : "No hay reportes resueltos."}
          onRetry={onRetry}
        />
      </div>

      {selectedCase ? (
        <div className="admin-report-dialog-backdrop" role="presentation" onClick={() => setSelectedCase(null)}>
          <section
            className="admin-report-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-report-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="admin-report-dialog__close"
              type="button"
              aria-label="Cerrar detalle"
              onClick={() => setSelectedCase(null)}
            >
              <CloseCircle size={24} weight="Linear" />
            </button>
            <span>
              {selectedCase.representative.targetType} · {selectedCase.reportCount}{" "}
              {selectedCase.reportCount === 1 ? "reporte" : "reportes"}
            </span>
            <h2 id="admin-report-title">
              {selectedCase.reportCount === 1
                ? selectedCase.representative.reason
                : `Reportes sobre este ${
                    selectedCase.representative.targetType === "Post" ? "post" : "comentario"
                  }`}
            </h2>
            <p>{selectedCase.representative.content}</p>

            {selectedCase.reportCount > 1 ? (
              <section className="admin-report-dialog__reasons" aria-labelledby="admin-report-reasons-title">
                <h3 id="admin-report-reasons-title">Motivos recibidos</h3>
                <ul>
                  {selectedCase.reasons.map((reason) => (
                    <li key={reason.reason}>
                      <span>{reason.reason}</span>
                      <strong>{reason.count}</strong>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <dl>
              <div>
                <dt>Autor</dt>
                <dd>{selectedCase.representative.author?.name ?? "Usuario eliminado"}</dd>
              </div>
              <div>
                <dt>Comunidad</dt>
                <dd>{selectedCase.representative.community?.name ?? "Sin comunidad"}</dd>
              </div>
              <div>
                <dt>{selectedCase.reporters.length === 1 ? "Reportó" : "Reportaron"}</dt>
                <dd>
                  {selectedCase.reporters.length
                    ? selectedCase.reporters.map((reporter) => reporter.name).join(", ")
                    : "Usuarios eliminados"}
                </dd>
              </div>
            </dl>
            {selectedCase.representative.status === "Pendiente" ? (
              <div className="admin-dialog-actions">
                <button
                  className="is-secondary"
                  type="button"
                  disabled={Boolean(busyStatus)}
                  onClick={() => void updateStatus("Desestimado")}
                >
                  {busyStatus === "Desestimado" ? <LoadingState variant="button" label="Desestimando" /> : "Desestimar"}
                </button>
                <button
                  className="is-danger"
                  type="button"
                  disabled={Boolean(busyStatus)}
                  onClick={() => void updateStatus("Resuelto")}
                >
                  {busyStatus === "Resuelto" ? (
                    <LoadingState variant="button" label="Eliminando contenido" />
                  ) : (
                    "Eliminar contenido"
                  )}
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}

export function AdminDashboard({
  accessToken,
  profileEmail,
  communities,
  events,
  refreshKey = 0,
  onBack,
  onCreateEvent
}: AdminDashboardProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>("communities");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resourceStatus, setResourceStatus] = useState(initialResourceStatus);
  const [reloadKey, setReloadKey] = useState(0);
  const [actionError, setActionError] = useState("");
  const [pendingCommunities, setPendingCommunities] = useState<AdminCommunity[]>([]);
  const [pendingEvents, setPendingEvents] = useState<AdminEvent[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [acceptedCommunities, setAcceptedCommunities] = useState<CommunityReview[]>([]);
  const [acceptedEvents, setAcceptedEvents] = useState<EventReview[]>([]);

  const approvedCommunities = useMemo(() => {
    const fromApp = communities
      .filter((community) => community.status?.toLowerCase() === "aceptado")
      .map(mapApprovedCommunity);
    const ids = new Set(fromApp.map((community) => community.id));
    return [...acceptedCommunities.filter((community) => !ids.has(community.id)), ...fromApp];
  }, [acceptedCommunities, communities]);

  const publishedEvents = useMemo(() => {
    const fromApp = events.map(mapPublishedEvent);
    const ids = new Set(fromApp.map((event) => event.id));
    return [...acceptedEvents.filter((event) => !ids.has(event.id)), ...fromApp];
  }, [acceptedEvents, events]);

  useEffect(() => {
    const controller = new AbortController();

    const requests = [
      listAdminCommunities(accessToken, controller.signal),
      listAdminEvents(accessToken, controller.signal),
      listAdminUsers(accessToken, controller.signal),
      listAdminReports(accessToken, controller.signal)
    ] as const;

    void Promise.allSettled(requests).then(([communityResult, eventResult, userResult, reportResult]) => {
      if (controller.signal.aborted) return;

      if (communityResult.status === "fulfilled") setPendingCommunities(communityResult.value);
      if (eventResult.status === "fulfilled") setPendingEvents(eventResult.value);
      if (userResult.status === "fulfilled") setUsers(userResult.value);
      if (reportResult.status === "fulfilled") setReports(reportResult.value);

      setResourceStatus({
        communities: communityResult.status === "fulfilled" ? "ready" : "error",
        events: eventResult.status === "fulfilled" ? "ready" : "error",
        users: userResult.status === "fulfilled" ? "ready" : "error",
        reports: reportResult.status === "fulfilled" ? "ready" : "error"
      });
    });

    return () => controller.abort();
  }, [accessToken, refreshKey, reloadKey]);

  function retrySection(section: AdminSection): void {
    setResourceStatus((current) => ({ ...current, [section]: "loading" }));
    setReloadKey((current) => current + 1);
  }

  function updateCommunityLocally(community: AdminCommunity, nextStatus: AdminPublicationStatus): void {
    setPendingCommunities((current) => current.filter((item) => item.id !== community.id));
    if (nextStatus === "Aceptado") {
      setAcceptedCommunities((current) => [
        {
          ...mapPendingCommunity(community),
          pending: false,
          members: 1
        },
        ...current
      ]);
    }
  }

  function updateEventLocally(event: AdminEvent, nextStatus: AdminPublicationStatus): void {
    setPendingEvents((current) => current.filter((item) => item.id !== event.id));
    if (nextStatus === "Aceptado") {
      setAcceptedEvents((current) => [{ ...mapPendingEvent(event), pending: false }, ...current]);
    }
  }

  return (
    <div className="admin-mobile-page">
      <div className="admin-mobile-shell">
        <header className="admin-mobile-header">
          <nav className="admin-mobile-nav" aria-label="Secciones de administración">
            {adminSections.map(({ id, label, Icon }) => {
              const active = activeSection === id;
              return (
                <button
                  className={cn(active && "is-active")}
                  type="button"
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  key={id}
                  onClick={() => {
                    setActiveSection(id);
                    setSettingsOpen(false);
                    setActionError("");
                  }}
                >
                  <Icon size={id === "events" ? 20 : 22} weight="Linear" aria-hidden="true" />
                </button>
              );
            })}
          </nav>
          <button
            className={cn("admin-settings-button", settingsOpen && "is-active")}
            type="button"
            aria-label="Configuración"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((current) => !current)}
          >
            <Settings size={25} weight="Linear" aria-hidden="true" />
          </button>
          {settingsOpen ? (
            <div className="admin-settings-menu">
              <span>{profileEmail ?? "Administrador"}</span>
              <button type="button" onClick={onBack}>
                <Logout2 size={18} weight="Linear" aria-hidden="true" />
                Cerrar sesión
              </button>
            </div>
          ) : null}
        </header>

        <main className={cn("admin-mobile-content", `admin-mobile-content--${activeSection}`)}>
          {activeSection !== "events" ? (
            <h1>{adminSections.find((section) => section.id === activeSection)?.label}</h1>
          ) : null}
          {actionError ? (
            <p className="admin-action-error" role="alert">
              {actionError}
            </p>
          ) : null}
          {activeSection === "communities" ? (
            <CommunitiesPanel
              accessToken={accessToken}
              pendingCommunities={pendingCommunities}
              approvedCommunities={approvedCommunities}
              status={resourceStatus.communities}
              onRetry={() => retrySection("communities")}
              onUpdated={updateCommunityLocally}
              onError={setActionError}
            />
          ) : null}
          {activeSection === "events" ? (
            <EventsPanel
              accessToken={accessToken}
              pendingEvents={pendingEvents}
              publishedEvents={publishedEvents}
              status={resourceStatus.events}
              onCreateEvent={onCreateEvent}
              onRetry={() => retrySection("events")}
              onUpdated={updateEventLocally}
              onError={setActionError}
            />
          ) : null}
          {activeSection === "users" ? (
            <UsersPanel
              accessToken={accessToken}
              users={users}
              status={resourceStatus.users}
              onRetry={() => retrySection("users")}
              onDeleted={(legajo) => setUsers((current) => current.filter((user) => user.legajo !== legajo))}
              onError={setActionError}
            />
          ) : null}
          {activeSection === "reports" ? (
            <ReportsPanel
              accessToken={accessToken}
              reports={reports}
              status={resourceStatus.reports}
              onRetry={() => retrySection("reports")}
              onUpdated={(updated) => {
                setReports((current) => {
                  const updatedById = new Map(updated.map((report) => [report.id, report]));
                  return current.map((report) => updatedById.get(report.id) ?? report);
                });
                setReloadKey((current) => current + 1);
              }}
              onError={setActionError}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}

export function AdminAccessDenied({ onBack }: { onBack: () => void }) {
  return (
    <div className="admin-access-denied">
      <ForbiddenCircle size={42} weight="LineDuotone" aria-hidden="true" />
      <h1>Acceso administrativo</h1>
      <p>Este panel está reservado para usuarios con permisos de administración.</p>
      <button type="button" onClick={onBack}>
        Volver a Kreis
      </button>
    </div>
  );
}

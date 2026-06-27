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
  UserCircle,
  UsersGroupRounded
} from "@solar-icons/react";
import { useMemo, useState } from "react";
import type { ActivityPost, Community, KreisEvent } from "../../types";
import { cn } from "../../utils/cn";

type AdminSection = "communities" | "events" | "users" | "reports";
type CommunityView = "requests" | "approved";
type EventView = "requests" | "published";
type ReportView = "incoming" | "resolved";

type AdminDashboardProps = {
  profileEmail?: string;
  communities: Community[];
  events: KreisEvent[];
  posts: ActivityPost[];
  onBack: () => void;
};

type CommunityReview = {
  id: string;
  name: string;
  author: string;
  topics: string[];
  description: string;
  members?: number;
};

type EventReview = {
  id: string;
  title: string;
  day: string;
  month: string;
  place: string;
};

type ReportReview = {
  id: string;
  reason: string;
  community: string;
  age: string;
  content: string;
  author: string;
};

type UserReview = {
  id: string;
  name: string;
  email: string;
};

const adminSections = [
  { id: "communities", label: "Comunidades", Icon: UsersGroupRounded },
  { id: "events", label: "Eventos", Icon: CalendarMinimalistic },
  { id: "users", label: "Usuarios", Icon: UserCircle },
  { id: "reports", label: "Reportes", Icon: Flag }
] satisfies Array<{ id: AdminSection; label: string; Icon: typeof UsersGroupRounded }>;

const fallbackCommunities: CommunityReview[] = [
  {
    id: "community-ufc",
    name: "Grupo de UFC",
    author: "Nicolas Giordano",
    topics: ["Deporte", "Entretenimiento"],
    description: "Comunidad que lo abarca todo sobre UFC. ¡A celebrar, fanáticos de las peleas!"
  },
  {
    id: "community-cocina",
    name: "Cocina Italiana",
    author: "Nicolas Umansky",
    topics: ["Gastronomía"],
    description: "Si les gusta la cocina y andan buscando recetas o ideas, esta es tu comunidad."
  }
];

const fallbackEvents: EventReview[] = [
  {
    id: "event-football",
    title: "Torneo de Futbol 5",
    day: "26",
    month: "MAY",
    place: "Parque Sarmiento"
  }
];

const fallbackReports: ReportReview[] = [
  {
    id: "report-language",
    reason: "Lenguaje agresivo",
    community: "Emprendedores UADE",
    age: "Hace 12 minutos",
    content: "Contenido reportado por lenguaje agresivo dentro de una conversación.",
    author: "Usuario Kreis"
  }
];

const fallbackUsers: UserReview[] = [
  { id: "user-nicolas", name: "Nicolas Giordano", email: "ngiordano@uade.edu.ar" },
  { id: "user-franco", name: "Franco Lan", email: "flan@uade.edu.ar" }
];

function toCommunityReviews(communities: Community[]): CommunityReview[] {
  if (!communities.length) return fallbackCommunities;

  return communities.map((community) => ({
    id: community.id,
    name: community.name,
    author: "Usuario Kreis",
    topics: community.topics?.map((topic) => topic.name).filter(Boolean) ?? [community.category],
    description: community.description ?? community.pulse,
    members: community.members
  }));
}

function toEventReviews(events: KreisEvent[]): EventReview[] {
  if (!events.length) return fallbackEvents;

  return events.map((event) => ({
    id: event.id,
    title: event.title,
    day: event.day,
    month: event.month,
    place: event.place
  }));
}

function toReportReviews(posts: ActivityPost[]): ReportReview[] {
  if (!posts.length) return fallbackReports;

  return posts.slice(0, 5).map((post, index) => ({
    id: `report-${post.id}`,
    reason: index === 0 ? "Lenguaje agresivo" : "Contenido inapropiado",
    community: post.communityName,
    age: index === 0 ? "Hace 12 minutos" : post.time,
    content: post.text,
    author: post.author
  }));
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

function CommunityCard({
  community,
  pending,
  onApprove,
  onReject
}: {
  community: CommunityReview;
  pending: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  return (
    <article className="admin-community-card">
      <div className="admin-community-card__heading">
        <div>
          <h2>{community.name}</h2>
          <p>{community.author}</p>
        </div>
        {pending ? (
          <div className="admin-community-card__actions">
            <button className="is-approve" type="button" onClick={onApprove}>
              <CheckCircle size={11} weight="Linear" aria-hidden="true" />
              Aceptar
            </button>
            <button className="is-reject" type="button" onClick={onReject}>
              <CloseCircle size={11} weight="Linear" aria-hidden="true" />
              Rechazar
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

function CommunitiesPanel({ communities }: { communities: CommunityReview[] }) {
  const [view, setView] = useState<CommunityView>("requests");
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const pending = communities.filter((community) => !reviewedIds.includes(community.id));
  const visible = view === "requests" ? pending : communities;

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
        {visible.map((community) => (
          <CommunityCard
            community={community}
            pending={view === "requests"}
            key={community.id}
            onApprove={() => setReviewedIds((current) => [...current, community.id])}
            onReject={() => setReviewedIds((current) => [...current, community.id])}
          />
        ))}
        {!visible.length ? <p className="admin-empty-state">No hay solicitudes pendientes.</p> : null}
      </div>
    </>
  );
}

function EventCard({ event }: { event: EventReview }) {
  return (
    <article className="admin-event-card">
      <div className="admin-event-card__date" aria-label={`${event.day} ${event.month}`}>
        <strong>{event.day}</strong>
        <span>{event.month}</span>
      </div>
      <div className="admin-event-card__content">
        <h2>{event.title}</h2>
        <p>
          <MapPoint size={10} weight="Linear" aria-hidden="true" />
          {event.place}
        </p>
      </div>
      <AltArrowRight className="admin-event-card__arrow" size={15} weight="Linear" aria-hidden="true" />
    </article>
  );
}

function EventsPanel({ events }: { events: EventReview[] }) {
  const [view, setView] = useState<EventView>("requests");

  return (
    <>
      <div className="admin-title-row">
        <h1>Eventos</h1>
        <button className="admin-create-event" type="button">
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
        {events.map((event) => (
          <EventCard event={event} key={event.id} />
        ))}
      </div>
    </>
  );
}

function UsersPanel({ users }: { users: UserReview[] }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const visibleUsers = users.filter((user) =>
    `${user.name} ${user.email}`.toLocaleLowerCase("es").includes(normalizedQuery)
  );

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
          <article className="admin-user-card" key={user.id}>
            <div className="admin-user-card__avatar" aria-hidden="true" />
            <div className="admin-user-card__identity">
              <h2>{user.name}</h2>
              <p>{user.email}</p>
            </div>
            <button type="button">
              <ForbiddenCircle size={12} weight="Linear" aria-hidden="true" />
              Suspender
            </button>
          </article>
        ))}
        {!visibleUsers.length ? <p className="admin-empty-state">No encontramos usuarios.</p> : null}
      </div>
    </>
  );
}

function ReportsPanel({ reports }: { reports: ReportReview[] }) {
  const [view, setView] = useState<ReportView>("incoming");
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportReview | null>(null);
  const visibleReports = reports.filter((report) =>
    view === "resolved" ? resolvedIds.includes(report.id) : !resolvedIds.includes(report.id)
  );

  function resolveSelected(): void {
    if (!selectedReport) return;
    setResolvedIds((current) => [...current, selectedReport.id]);
    setSelectedReport(null);
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
        {visibleReports.map((report) => (
          <article className="admin-report-card" key={report.id}>
            <div>
              <h2>{report.reason}</h2>
              <p>
                {report.community} · {report.age}
              </p>
            </div>
            <button type="button" onClick={() => setSelectedReport(report)}>
              Ver detalle
            </button>
          </article>
        ))}
        {!visibleReports.length ? <p className="admin-empty-state">No hay reportes en esta sección.</p> : null}
      </div>

      {selectedReport ? (
        <div className="admin-report-dialog-backdrop" role="presentation" onClick={() => setSelectedReport(null)}>
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
              onClick={() => setSelectedReport(null)}
            >
              <CloseCircle size={24} weight="Linear" />
            </button>
            <span>Reporte</span>
            <h2 id="admin-report-title">{selectedReport.reason}</h2>
            <p>{selectedReport.content}</p>
            <dl>
              <div>
                <dt>Autor</dt>
                <dd>{selectedReport.author}</dd>
              </div>
              <div>
                <dt>Comunidad</dt>
                <dd>{selectedReport.community}</dd>
              </div>
            </dl>
            {view === "incoming" ? (
              <button className="admin-report-dialog__resolve" type="button" onClick={resolveSelected}>
                Marcar como resuelto
              </button>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}

export function AdminDashboard({ profileEmail, communities, events, posts, onBack }: AdminDashboardProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>("communities");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const communityReviews = useMemo(() => toCommunityReviews(communities), [communities]);
  const eventReviews = useMemo(() => toEventReviews(events), [events]);
  const reportReviews = useMemo(() => toReportReviews(posts), [posts]);

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
          {activeSection === "communities" ? <CommunitiesPanel communities={communityReviews} /> : null}
          {activeSection === "events" ? <EventsPanel events={eventReviews} /> : null}
          {activeSection === "users" ? <UsersPanel users={fallbackUsers} /> : null}
          {activeSection === "reports" ? <ReportsPanel reports={reportReviews} /> : null}
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

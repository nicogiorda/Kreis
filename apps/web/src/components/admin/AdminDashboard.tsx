import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarBlank,
  CheckCircle,
  DotsThree,
  Flag,
  MagnifyingGlass,
  SealCheck,
  ShieldCheck,
  UserCircle,
  UsersThree,
  WarningCircle,
  XCircle
} from "@phosphor-icons/react";
import type { ActivityPost, Community, KreisEvent } from "../../types";
import { cn } from "../../utils/cn";

type AdminSection = "communities" | "events" | "reports" | "users";

type AdminDashboardProps = {
  profileEmail?: string;
  communities: Community[];
  events: KreisEvent[];
  posts: ActivityPost[];
  onBack: () => void;
};

type PendingItem = {
  id: string;
  title: string;
  meta: string;
  detail: string;
  status: string;
};

type ReportItem = {
  id: string;
  target: string;
  author: string;
  community: string;
  reason: string;
  excerpt: string;
  age: string;
  priority: "alta" | "media" | "baja";
};

type UserItem = {
  id: string;
  name: string;
  email: string;
  status: string;
  reports: number;
  activity: string;
};

const adminSections: Array<{ id: AdminSection; label: string; icon: typeof Flag }> = [
  { id: "communities", label: "Comunidades", icon: UsersThree },
  { id: "events", label: "Eventos", icon: CalendarBlank },
  { id: "reports", label: "Reportes", icon: Flag },
  { id: "users", label: "Usuarios", icon: UserCircle }
];

const fallbackCommunities: PendingItem[] = [
  {
    id: "community-data",
    title: "Data Club UADE",
    meta: "Tecnologia · 42 miembros esperando",
    detail: "Comunidad para compartir proyectos, apuntes y busquedas de equipo.",
    status: "Nueva"
  },
  {
    id: "community-marketing",
    title: "Marketing y Creatividad",
    meta: "Negocios · 31 miembros esperando",
    detail: "Pide aprobacion para publicar actividades, referencias y trabajos practicos.",
    status: "Revisar"
  },
  {
    id: "community-running",
    title: "Running Kreis",
    meta: "Deportes · 76 miembros esperando",
    detail: "Entrenamientos por zona y salidas abiertas para estudiantes.",
    status: "Lista"
  }
];

const fallbackEvents: PendingItem[] = [
  {
    id: "event-design",
    title: "After de diseno",
    meta: "Vie 19:30 · Palermo",
    detail: "Encuentro abierto para estudiantes de diseno y comunicacion.",
    status: "Lugar externo"
  },
  {
    id: "event-football",
    title: "Torneo relampago de futbol",
    meta: "Sab 10:00 · Sede Monserrat",
    detail: "Evento de comunidad deportiva con cupos limitados.",
    status: "Cupos"
  },
  {
    id: "event-finance",
    title: "Finanzas personales",
    meta: "Mar 18:00 · Aula magna",
    detail: "Charla propuesta por estudiantes con invitado externo.",
    status: "Invitado"
  }
];

const fallbackReports: ReportItem[] = [
  {
    id: "report-running",
    target: "Comentario",
    author: "Gonzalo Martin Gomez",
    community: "Running Kreis",
    reason: "Lenguaje agresivo",
    excerpt: "No running",
    age: "Hace 7 min",
    priority: "alta"
  },
  {
    id: "report-gastro",
    target: "Posteo",
    author: "Vito Nava",
    community: "Gastronomia",
    reason: "Spam o promocion",
    excerpt: "Paso link para anotarse por fuera de la app.",
    age: "Hace 34 min",
    priority: "media"
  },
  {
    id: "report-event",
    target: "Evento",
    author: "Nicolas Umansky",
    community: "Eventos",
    reason: "Datos incompletos",
    excerpt: "El evento no informa organizador ni cupos.",
    age: "Hoy",
    priority: "baja"
  }
];

const fallbackUsers: UserItem[] = [
  {
    id: "user-admin",
    name: "Kreis Admin",
    email: "kreis1app@gmail.com",
    status: "Admin",
    reports: 0,
    activity: "Activo hoy"
  },
  {
    id: "user-gonzalo",
    name: "Gonzalo Martin Gomez",
    email: "gmartin@uade.edu.ar",
    status: "Verificado",
    reports: 2,
    activity: "12 dias"
  },
  {
    id: "user-vito",
    name: "Vito Nava",
    email: "vnava@uade.edu.ar",
    status: "Verificado",
    reports: 1,
    activity: "21 dias"
  },
  {
    id: "user-nicolas",
    name: "Nicolas Umansky",
    email: "numansky@uade.edu.ar",
    status: "Pendiente",
    reports: 0,
    activity: "Ayer"
  }
];

function getPendingCommunities(communities: Community[]): PendingItem[] {
  const pending = communities.filter((community) => {
    const status = community.status?.toLowerCase() ?? "";
    return status.includes("pending") || status.includes("pendiente");
  });

  if (!pending.length) return fallbackCommunities;

  return pending.map((community) => ({
    id: community.id,
    title: community.name,
    meta: `${community.category} · ${community.members} miembros`,
    detail: community.description ?? community.pulse,
    status: "Pendiente"
  }));
}

function getPendingEvents(events: KreisEvent[]): PendingItem[] {
  const pending = events.filter((event) => {
    const text = `${event.title} ${event.category} ${event.description}`.toLowerCase();
    return text.includes("pendiente") || text.includes("pending");
  });

  if (!pending.length) return fallbackEvents;

  return pending.map((event) => ({
    id: event.id,
    title: event.title,
    meta: `${event.day} ${event.month} · ${event.place}`,
    detail: event.description,
    status: event.official ? "Oficial" : "Pendiente"
  }));
}

function getReports(posts: ActivityPost[]): ReportItem[] {
  if (!posts.length) return fallbackReports;

  return posts.slice(0, 3).map((post, index) => ({
    id: `report-${post.id}`,
    target: "Posteo",
    author: post.author || "Usuario Kreis",
    community: post.communityName,
    reason: ["Contenido fuera de tema", "Lenguaje agresivo", "Spam o promocion"][index] ?? "Revision manual",
    excerpt: post.text,
    age: index === 0 ? "Hace 12 min" : index === 1 ? "Hace 1 h" : "Hoy",
    priority: index === 0 ? "alta" : index === 1 ? "media" : "baja"
  }));
}

function AdminActionButtons({ approveLabel = "Aprobar" }: { approveLabel?: string }) {
  return (
    <div className="kreis-admin-actions">
      <button className="kreis-admin-action-primary" type="button">
        <CheckCircle size={18} weight="bold" />
        {approveLabel}
      </button>
      <button className="kreis-admin-action-muted" type="button">
        <XCircle size={18} weight="bold" />
        Rechazar
      </button>
    </div>
  );
}

function QueueItem({ item, active, onSelect }: { item: PendingItem; active?: boolean; onSelect: () => void }) {
  return (
    <button className={cn("kreis-admin-queue-item", active && "is-active")} type="button" onClick={onSelect}>
      <span>{item.status}</span>
      <strong>{item.title}</strong>
      <small>{item.meta}</small>
    </button>
  );
}

function CommunitiesPanel({ items }: { items: PendingItem[] }) {
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const selected = items.find((item) => item.id === selectedId) ?? items[0];

  if (!selected) return null;

  return (
    <section className="kreis-admin-panel-grid">
      <div className="kreis-admin-queue">
        <div className="kreis-admin-section-title">
          <span>Cola</span>
          <strong>{items.length} pendientes</strong>
        </div>
        {items.map((item) => (
          <QueueItem item={item} key={item.id} active={item.id === selected.id} onSelect={() => setSelectedId(item.id)} />
        ))}
      </div>

      <article className="kreis-admin-review-detail">
        <div className="kreis-admin-detail-header">
          <span className="kreis-admin-badge">Comunidad</span>
          <DotsThree size={24} weight="bold" />
        </div>
        <h2>{selected.title}</h2>
        <p>{selected.detail}</p>
        <div className="kreis-admin-detail-list">
          <span>Categoria</span>
          <strong>{selected.meta}</strong>
          <span>Chequeo</span>
          <strong>Nombre, descripcion y topicos listos para revision.</strong>
        </div>
        <AdminActionButtons />
      </article>
    </section>
  );
}

function EventsPanel({ items }: { items: PendingItem[] }) {
  return (
    <section className="kreis-admin-events-layout">
      <div className="kreis-admin-event-timeline">
        {items.map((item, index) => (
          <article className="kreis-admin-event-row" key={item.id}>
            <div className="kreis-admin-date-chip">
              <strong>{String(index + 1).padStart(2, "0")}</strong>
              <span>rev</span>
            </div>
            <div>
              <span>{item.status}</span>
              <h2>{item.title}</h2>
              <p>{item.meta}</p>
              <small>{item.detail}</small>
            </div>
            <AdminActionButtons approveLabel="Publicar" />
          </article>
        ))}
      </div>

      <aside className="kreis-admin-checklist">
        <h2>Antes de publicar</h2>
        <p>Este bloque separa eventos de comunidades porque aca importa fecha, lugar, descripcion y riesgo de convocatoria.</p>
        <ul>
          <li>Fecha y horario claros</li>
          <li>Lugar reconocible</li>
          <li>Descripcion suficiente</li>
          <li>No es academico obligatorio</li>
        </ul>
      </aside>
    </section>
  );
}

function ReportsPanel({ reports }: { reports: ReportItem[] }) {
  const [selectedId, setSelectedId] = useState(reports[0]?.id ?? "");
  const selected = reports.find((report) => report.id === selectedId) ?? reports[0];

  if (!selected) return null;

  return (
    <section className="kreis-admin-report-layout">
      <div className="kreis-admin-report-inbox">
        {reports.map((report) => (
          <button className={cn("kreis-admin-report-item", report.id === selected.id && "is-active")} key={report.id} type="button" onClick={() => setSelectedId(report.id)}>
            <span className={cn("kreis-admin-priority", `is-${report.priority}`)} />
            <strong>{report.reason}</strong>
            <small>{report.community} · {report.age}</small>
          </button>
        ))}
      </div>

      <article className="kreis-admin-report-detail">
        <div className="kreis-admin-detail-header">
          <span className={cn("kreis-admin-badge", selected.priority === "alta" && "is-urgent")}>{selected.priority}</span>
          <span>{selected.age}</span>
        </div>
        <h2>{selected.target} reportado</h2>
        <p className="kreis-admin-report-copy">{selected.excerpt}</p>
        <div className="kreis-admin-detail-list">
          <span>Autor</span>
          <strong>{selected.author}</strong>
          <span>Comunidad</span>
          <strong>{selected.community}</strong>
          <span>Motivo</span>
          <strong>{selected.reason}</strong>
        </div>
        <div className="kreis-admin-actions">
          <button className="kreis-admin-action-primary" type="button">Marcar revisado</button>
          <button className="kreis-admin-action-muted" type="button">Ocultar contenido</button>
        </div>
      </article>
    </section>
  );
}

function UsersPanel({ users }: { users: UserItem[] }) {
  return (
    <section className="kreis-admin-users-layout">
      <div className="kreis-admin-users-table">
        {users.map((user) => (
          <article className="kreis-admin-user-row" key={user.id}>
            <div className="kreis-admin-avatar">{user.name.slice(0, 1)}</div>
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
            <small>{user.status}</small>
            <small>{user.reports} reportes</small>
            <button type="button" aria-label={`Mas opciones para ${user.name}`}>
              <DotsThree size={23} weight="bold" />
            </button>
          </article>
        ))}
      </div>

      <aside className="kreis-admin-role-card">
        <SealCheck size={25} weight="fill" />
        <h2>Permisos</h2>
        <p>El panel se muestra para usuarios con rol Administrador. Los estudiantes quedan dentro de la app principal.</p>
      </aside>
    </section>
  );
}

export function AdminDashboard({ profileEmail, communities, events, posts, onBack }: AdminDashboardProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>("reports");
  const pendingCommunities = useMemo(() => getPendingCommunities(communities), [communities]);
  const pendingEvents = useMemo(() => getPendingEvents(events), [events]);
  const reports = useMemo(() => getReports(posts), [posts]);
  const users = fallbackUsers;
  const activeLabel = adminSections.find((section) => section.id === activeSection)?.label ?? "Admin";

  return (
    <div className="kreis-admin-page">
      <header className="kreis-admin-header">
        <button className="kreis-admin-back" type="button" onClick={onBack}>
          <ArrowLeft size={20} />
          Cerrar sesion
        </button>
        <div className="kreis-admin-brand">
          <ShieldCheck size={25} weight="fill" />
          <span>kreis</span>
        </div>
        <label className="kreis-admin-search">
          <MagnifyingGlass size={17} />
          <input type="search" placeholder="Buscar en administracion" />
        </label>
      </header>

      <main className="kreis-admin-shell">
        <aside className="kreis-admin-summary">
          <span>Administracion</span>
          <h1>Revision de Kreis</h1>
          <p>{profileEmail ?? "kreis1app@gmail.com"}</p>

          <div className="kreis-admin-counts">
            <article>
              <strong>{pendingCommunities.length}</strong>
              <span>comunidades</span>
            </article>
            <article>
              <strong>{pendingEvents.length}</strong>
              <span>eventos</span>
            </article>
            <article>
              <strong>{reports.length}</strong>
              <span>reportes</span>
            </article>
          </div>
        </aside>

        <section className="kreis-admin-work">
          <nav className="kreis-admin-tabs" aria-label="Secciones de administracion">
            {adminSections.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.id;

              return (
                <button className={cn(active && "is-active")} type="button" aria-current={active ? "page" : undefined} key={section.id} onClick={() => setActiveSection(section.id)}>
                  <Icon size={18} weight={active ? "fill" : "regular"} />
                  {section.label}
                </button>
              );
            })}
          </nav>

          <div className="kreis-admin-work-heading">
            <div>
              <span>Modulo</span>
              <h2>{activeLabel}</h2>
            </div>
            <div className="kreis-admin-status">
              <WarningCircle size={17} weight="bold" />
              Frontend demo
            </div>
          </div>

          {activeSection === "communities" ? <CommunitiesPanel items={pendingCommunities} /> : null}
          {activeSection === "events" ? <EventsPanel items={pendingEvents} /> : null}
          {activeSection === "reports" ? <ReportsPanel reports={reports} /> : null}
          {activeSection === "users" ? <UsersPanel users={users} /> : null}
        </section>
      </main>
    </div>
  );
}

export function AdminAccessDenied({ onBack }: { onBack: () => void }) {
  return (
    <div className="kreis-admin-page kreis-admin-page--denied">
      <section className="kreis-admin-denied">
        <ShieldCheck size={42} weight="fill" />
        <h1>Acceso administrativo</h1>
        <p>Este panel esta reservado para usuarios con permisos de administracion.</p>
        <button type="button" onClick={onBack}>
          Volver a Kreis
        </button>
      </section>
    </div>
  );
}

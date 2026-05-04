import { useEffect, useMemo, useState } from "react";
import { profile as baseProfile } from "../../data/profile";
import type { ActivityPost, Community, KreisEvent } from "../../types";
import { MenuIcon, NotificationIcon } from "../common/Icons";

type ProfileScreenProps = {
  communities: Community[];
  events: KreisEvent[];
  activity?: ActivityPost[];
  menuOpen?: boolean;
  onToggleMenu?: () => void;
  onOpenCommunities?: () => void;
  onOpenEvents?: () => void;
};

type Glyph =
  | "badge"
  | "bell"
  | "bookmark"
  | "calendar"
  | "check"
  | "chevron"
  | "clock"
  | "edit"
  | "eye"
  | "globe"
  | "heart"
  | "link"
  | "lock"
  | "map"
  | "phone"
  | "settings"
  | "share"
  | "star"
  | "trophy"
  | "user"
  | "users";

type ProfileEditorTab = "profile" | "personal" | "interests" | "socials" | "preferences" | "public";
type NotificationFrequency = "instant" | "daily" | "weekly";
type ProfileVisibility = "public" | "contacts" | "private";
type ContactPermission = "everyone" | "contacts" | "none";

type EditableProfile = {
  name: string;
  career: string;
  photo: string;
  cover: string;
  campus: string;
  quote: string;
  bio: string;
  attitude: string;
  completion: number;
  city: string;
  languages: string;
  availability: string;
  email: string;
  phone: string;
  interests: string;
  skills: string;
  instagram: string;
  linkedin: string;
  github: string;
  portfolio: string;
  notifications: string;
  privacy: string;
  account: string;
  saved: string;
  notificationsEnabled: boolean;
  notifyEvents: boolean;
  notifyCommunities: boolean;
  notifyMessages: boolean;
  notificationFrequency: NotificationFrequency;
  profileVisibility: ProfileVisibility;
  allowContact: ContactPermission;
  showEmail: boolean;
  showPhone: boolean;
  twoFactorEnabled: boolean;
  sessionAlerts: boolean;
  savedEventsEnabled: boolean;
  savedCommunitiesEnabled: boolean;
  savedPostsEnabled: boolean;
};

const profileStorageKey = "kreis-profile-settings";

const defaultProfileSettings: EditableProfile = {
  name: baseProfile.name,
  career: baseProfile.career,
  photo: baseProfile.photo,
  cover: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
  campus: "UADE - Buenos Aires",
  quote: "Conectando ideas, personas y oportunidades.",
  bio: "Estudiante apasionado por la tecnologia, el diseno y los buenos encuentros. Siempre buscando una excusa para conocer gente nueva, aprender cosas y crear proyectos que sumen.",
  attitude: "Colaborador",
  completion: 92,
  city: "Buenos Aires, Argentina",
  languages: "Espanol nativo\nIngles avanzado",
  availability: "Tardes y fines de semana",
  email: "nico.alvarez@uade.edu.ar",
  phone: "+54 11 2345 6789",
  interests: "Diseno, Tecnologia, Cine, Musica, Networking, Innovacion",
  skills: "Figma, UX/UI, Gestion de Proyectos, HTML/CSS, Comunicacion, Python, Excel, Analisis de Datos",
  instagram: "@nico.alvarez",
  linkedin: "/in/nicoalvarez",
  github: "/nicoalvarez",
  portfolio: "nicoalvarez.dev",
  notifications: "Personaliza tus alertas",
  privacy: "Quien puede ver tu informacion",
  account: "Datos y seguridad",
  saved: "Eventos, comunidades y mas",
  notificationsEnabled: true,
  notifyEvents: true,
  notifyCommunities: true,
  notifyMessages: false,
  notificationFrequency: "daily",
  profileVisibility: "contacts",
  allowContact: "contacts",
  showEmail: false,
  showPhone: false,
  twoFactorEnabled: false,
  sessionAlerts: true,
  savedEventsEnabled: true,
  savedCommunitiesEnabled: true,
  savedPostsEnabled: false
};

const achievements = [
  { icon: "edit" as Glyph, title: "Explorador", text: "Unite a 1 comunidad" },
  { icon: "users" as Glyph, title: "Conector", text: "Asiste a 3 eventos" },
  { icon: "badge" as Glyph, title: "Colaborador", text: "Ayudaste en un evento" },
  { icon: "star" as Glyph, title: "Activo", text: "Perfil completo" }
];

export function ProfileScreen({ communities, events, activity = [], menuOpen = false, onToggleMenu, onOpenCommunities, onOpenEvents }: ProfileScreenProps) {
  const [profileData, setProfileData] = useState<EditableProfile>(() => loadProfileSettings());
  const [draft, setDraft] = useState<EditableProfile>(profileData);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileEditorTab>("profile");
  const [statusMessage, setStatusMessage] = useState("");

  // Scroll al top cuando se abre el perfil
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo(0, 0);
  }, []);

  const joined = communities.filter((community) => community.joined);
  const signedEvents = events.filter((event) => event.interested);
  const eventPool = [events[0], ...signedEvents, ...events].filter((event): event is KreisEvent => Boolean(event));
  const featuredEvents = [...new Map(eventPool.map((event) => [event.id, event])).values()].slice(0, 3);
  const contactCount = 128 + activity.length;
  const interestTags = useMemo(() => toTags(profileData.interests), [profileData.interests]);
  const skillTags = useMemo(() => toTags(profileData.skills), [profileData.skills]);
  const personalInfo = useMemo(
    () => [
      { icon: "map" as Glyph, title: "Ciudad", text: profileData.city },
      { icon: "globe" as Glyph, title: "Idioma", text: profileData.languages },
      { icon: "clock" as Glyph, title: "Disponibilidad", text: profileData.availability },
      { icon: "phone" as Glyph, title: "Contacto", text: `${profileData.email}\n${profileData.phone}` }
    ],
    [profileData]
  );
  const socialLinks = useMemo(
    () => [
      { brand: "IG", title: "Instagram", text: profileData.instagram || "Sin configurar", tone: "from-[#ff7a18] via-[#ff2f66] to-[#7a39ff]" },
      { brand: "in", title: "LinkedIn", text: profileData.linkedin || "Sin configurar", tone: "from-[#0a66c2] to-[#1f8bd6]" },
      { brand: "GH", title: "GitHub", text: profileData.github || "Sin configurar", tone: "from-[#111827] to-[#343942]" },
      { brand: "WWW", title: "Portfolio", text: profileData.portfolio || "Sin configurar", tone: "from-[#f0531c] to-[#9b4d24]" }
    ],
    [profileData]
  );
  const privacyItems = useMemo(
    () => [
      { icon: "bell" as Glyph, title: "Notificaciones", text: summarizeNotifications(profileData), tab: "preferences" as ProfileEditorTab },
      { icon: "lock" as Glyph, title: "Privacidad", text: summarizePrivacy(profileData), tab: "preferences" as ProfileEditorTab },
      { icon: "user" as Glyph, title: "Cuenta", text: summarizeAccount(profileData), tab: "preferences" as ProfileEditorTab },
      { icon: "bookmark" as Glyph, title: "Contenido guardado", text: summarizeSaved(profileData), tab: "preferences" as ProfileEditorTab }
    ],
    [profileData]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(profileStorageKey, JSON.stringify(profileData));
  }, [profileData]);

  useEffect(() => {
    if (!statusMessage || typeof window === "undefined") return;
    const timeoutId = window.setTimeout(() => setStatusMessage(""), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [statusMessage]);

  // Scroll al top cuando se abre el editor
  useEffect(() => {
    if (editorOpen && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [editorOpen]);

  function openEditor(tab: ProfileEditorTab): void {
    setDraft(profileData);
    setActiveTab(tab);
    setEditorOpen(true);
  }

  function updateDraft(field: keyof EditableProfile, value: string | number | boolean): void {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function saveProfile(): void {
    setProfileData(normalizeProfile(draft));
    setEditorOpen(false);
    setStatusMessage("Cambios guardados");
  }

  function handleViewAllCommunities(): void {
    if (onOpenCommunities) {
      onOpenCommunities();
      setStatusMessage("Viendo todas tus comunidades");
    }
  }

  function handleViewAllEvents(): void {
    if (onOpenEvents) {
      onOpenEvents();
      setStatusMessage("Viendo todos tus eventos");
    }
  }

  function handleCopyProfileLink(): void {
    if (typeof window !== "undefined") {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      setStatusMessage("Link del perfil copiado");
    }
  }

  async function shareProfile(): Promise<void> {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = `${profileData.name} en Kreis`;
    const text = `${profileData.name} - ${profileData.career}`;
    const browserNavigator = typeof navigator !== "undefined"
      ? navigator as Navigator & { share?: (data: ShareData) => Promise<void>; clipboard?: Clipboard }
      : null;

    try {
      if (browserNavigator?.share) {
        await browserNavigator.share({ title, text, url });
        setStatusMessage("Perfil compartido");
        return;
      }

      if (browserNavigator?.clipboard) {
        await browserNavigator.clipboard.writeText(url || title);
        setStatusMessage("Link copiado");
        return;
      }

      setStatusMessage("Perfil listo para compartir");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatusMessage("No se pudo compartir");
    }
  }

  return (
    <section className="profile-screen animate-[rise_220ms_ease-out]" data-screen="profile">
      <div className="profile-local-header">
        <button className="profile-header-icon" type="button" aria-label={menuOpen ? "Cerrar comunidades" : "Abrir comunidades"} aria-expanded={menuOpen} onClick={onToggleMenu}>
          <MenuIcon />
        </button>
        <span className="profile-brand">Kreis</span>
        <div className="profile-header-actions">
          <button className="profile-header-icon profile-notification-button" type="button" aria-label="Notificaciones" onClick={() => openEditor("preferences")}>
            <NotificationIcon />
            <span>2</span>
          </button>
          <button className="profile-header-icon" type="button" aria-label="Configuracion" onClick={() => openEditor("preferences")}>
            <ProfileGlyph type="settings" />
          </button>
        </div>
      </div>

      <article className="profile-hero" style={{ backgroundImage: `url(${profileData.cover})` }}>
        <div className="profile-hero-content">
          <div className="profile-avatar-wrap">
            <img className="profile-avatar" src={profileData.photo} alt={`Foto de ${profileData.name}`} />
            <button className="profile-avatar-edit" type="button" aria-label="Editar foto" onClick={() => openEditor("profile")}>
              <ProfileGlyph type="edit" />
            </button>
          </div>

          <div className="profile-identity">
            <h1>
              {profileData.name}
              <span aria-label="Perfil verificado">
                <ProfileGlyph type="check" />
              </span>
            </h1>
            <p>{profileData.career}</p>
            <span className="profile-location">
              <ProfileGlyph type="map" />
              {profileData.campus}
            </span>
            <blockquote>{profileData.quote}</blockquote>
          </div>

          <div className="profile-completion-card" aria-label={`Perfil completado al ${profileData.completion} por ciento`}>
            <span className="profile-completion-check">
              <ProfileGlyph type="check" />
            </span>
            <div>
              <strong>Perfil completado</strong>
              <div className="profile-progress">
                <span style={{ width: `${profileData.completion}%` }} />
              </div>
            </div>
            <b>{profileData.completion}%</b>
          </div>
        </div>

        <div className="profile-stats-card" aria-label="Resumen del perfil">
          <div className="profile-stats-top">
            <ProfileStat icon="users" value={joined.length} label="comunidades" />
            <ProfileStat icon="calendar" value={signedEvents.length} label="eventos" />
            <ProfileStat icon="users" value={contactCount} label="contactos" />
          </div>
          <div className="profile-stats-bottom">
            <ProfileStat icon="eye" value="359" label="seguidores" />
          </div>
        </div>
      </article>

      <div className="profile-actions-card">
        <button className="profile-action-button is-primary" type="button" onClick={() => openEditor("profile")}>
          <ProfileGlyph type="edit" />
          Editar perfil
        </button>
        <button className="profile-action-button" type="button" onClick={() => void shareProfile()}>
          <ProfileGlyph type="share" />
          Compartir
        </button>
        <button className="profile-action-button" type="button" onClick={() => handleCopyProfileLink()}>
          <ProfileGlyph type="link" />
          Copiar link
        </button>
      </div>

      <ProfileChipSection icon="heart" title="Intereses" linkLabel="Editar" items={interestTags} onAction={() => openEditor("interests")} />
      <ProfileChipSection icon="star" title="Habilidades" linkLabel="Editar" items={skillTags} onAction={() => openEditor("interests")} />

      <section className="profile-panel">
        <ProfileSectionHeader icon="users" title="Mis comunidades" action="Ver todas" onAction={handleViewAllCommunities} />
        <div className="profile-card-row">
          {joined.slice(0, 3).map((community) => (
            <article className="profile-mini-card" key={community.id}>
              <span className="profile-mini-avatar">{community.icon}</span>
              <div>
                <strong>{community.name}</strong>
                <small>{community.category}</small>
                <em>{community.members} miembros</em>
              </div>
              <ProfileGlyph type="chevron" />
            </article>
          ))}
        </div>
      </section>

      <section className="profile-panel">
        <ProfileSectionHeader icon="calendar" title="Eventos anotados" action="Ver todos" onAction={handleViewAllEvents} />
        <div className="profile-card-row">
          {featuredEvents.map((event) => (
            <article className="profile-event-card" key={event.id}>
              <time>
                <strong>{event.day}</strong>
                <span>{event.month}</span>
              </time>
              <div>
                <strong>{event.title}</strong>
                <small>
                  <ProfileGlyph type="map" />
                  {event.place}
                </small>
              </div>
              <ProfileGlyph type="bookmark" />
            </article>
          ))}
        </div>
      </section>

      <section className="profile-panel">
        <ProfileSectionHeader icon="trophy" title="Logros" action="Ver todos" onAction={() => setStatusMessage("Estos son todos tus logros")} />
        <div className="profile-achievement-grid">
          {achievements.map((achievement) => (
            <article className="profile-achievement" key={achievement.title}>
              <span>
                <ProfileGlyph type={achievement.icon} />
              </span>
              <div>
                <strong>{achievement.title}</strong>
                <small>{achievement.text}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="profile-panel">
        <ProfileSectionHeader icon="user" title="Informacion personal" action="Editar" onAction={() => openEditor("personal")} />
        <div className="profile-info-grid">
          {personalInfo.map((item) => (
            <article className="profile-info-item" key={item.title}>
              <ProfileGlyph type={item.icon} />
              <div>
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="profile-panel">
        <ProfileSectionHeader icon="link" title="Redes y enlaces" action="Editar" onAction={() => openEditor("socials")} />
        <div className="profile-link-grid">
          {socialLinks.map((item) => (
            <button className="profile-social-link" type="button" key={item.title} onClick={() => openEditor("socials")}>
              <span className={`bg-gradient-to-br ${item.tone}`}>{item.brand}</span>
              <div>
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="profile-panel">
        <ProfileSectionHeader icon="lock" title="Preferencias y privacidad" action="Editar" onAction={() => openEditor("preferences")} />
        <div className="profile-privacy-grid">
          {privacyItems.map((item) => (
            <button className="profile-privacy-item" type="button" key={item.title} onClick={() => openEditor(item.tab)}>
              <ProfileGlyph type={item.icon} />
              <span>
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </span>
              <ProfileGlyph type="chevron" />
            </button>
          ))}
        </div>
      </section>

      {editorOpen ? (
        <ProfileEditorModal
          activeTab={activeTab}
          draft={draft}
          joinedCount={joined.length}
          signedEventsCount={signedEvents.length}
          onClose={() => setEditorOpen(false)}
          onSave={saveProfile}
          onTabChange={setActiveTab}
          onUpdate={updateDraft}
        />
      ) : null}

      {statusMessage ? <div className="profile-toast" role="status">{statusMessage}</div> : null}
    </section>
  );
}

function ProfileStat({ icon, value, label }: { icon: Glyph; value: number | string; label: string }) {
  return (
    <div className="profile-stat">
      <span>
        <ProfileGlyph type={icon} />
      </span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function ProfileChipSection({ icon, title, linkLabel, items, onAction }: { icon: Glyph; title: string; linkLabel: string; items: string[]; onAction: () => void }) {
  return (
    <section className="profile-panel">
      <ProfileSectionHeader icon={icon} title={title} action={linkLabel} onAction={onAction} />
      <div className="profile-chip-list">
        {items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}

function ProfileSectionHeader({ icon, title, action, onAction }: { icon: Glyph; title: string; action: string; onAction?: () => void }) {
  return (
    <div className="profile-section-header">
      <ProfileSectionTitle icon={icon} title={title} />
      <button type="button" onClick={onAction}>{action}</button>
    </div>
  );
}

function ProfileSectionTitle({ icon, title }: { icon: Glyph; title: string }) {
  return (
    <div className="profile-section-title">
      <ProfileGlyph type={icon} />
      <h2>{title}</h2>
    </div>
  );
}

function ProfileEditorModal({
  activeTab,
  draft,
  joinedCount,
  signedEventsCount,
  onClose,
  onSave,
  onTabChange,
  onUpdate
}: {
  activeTab: ProfileEditorTab;
  draft: EditableProfile;
  joinedCount: number;
  signedEventsCount: number;
  onClose: () => void;
  onSave: () => void;
  onTabChange: (tab: ProfileEditorTab) => void;
  onUpdate: (field: keyof EditableProfile, value: string | number | boolean) => void;
}) {
  const [actionMessage, setActionMessage] = useState("");
  const tabs: Array<{ id: ProfileEditorTab; label: string }> = [
    { id: "profile", label: "Perfil" },
    { id: "personal", label: "Datos" },
    { id: "interests", label: "Intereses" },
    { id: "socials", label: "Redes" },
    { id: "preferences", label: "Preferencias" },
    { id: "public", label: "Vista" }
  ];

  function handleImageUpload(field: "photo" | "cover", file: File | null): void {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setActionMessage("Elegi un archivo de imagen valido.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onUpdate(field, reader.result);
        setActionMessage(field === "photo" ? "Foto actualizada en la vista previa." : "Portada actualizada en la vista previa.");
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="profile-editor-backdrop" role="presentation">
      <form
        className="profile-editor"
        aria-label="Editar perfil"
        onSubmit={(event) => {
          event.preventDefault();
          activeTab === "public" ? onClose() : onSave();
        }}
      >
        <div className="profile-editor-topbar">
          <div>
            <span>Configuracion de perfil</span>
            <h3>{activeTab === "public" ? "Vista publica" : "Editar informacion"}</h3>
          </div>
          <button className="profile-editor-close" type="button" aria-label="Cerrar editor" onClick={onClose}>
            x
          </button>
        </div>

        <div className="profile-editor-tabs" role="tablist" aria-label="Secciones de perfil">
          {tabs.map((tab) => (
            <button
              className={activeTab === tab.id ? "is-active" : ""}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="profile-editor-body">
          {activeTab === "profile" ? (
            <div className="profile-edit-panel">
              <section className="profile-media-manager">
                <div className="profile-media-preview" style={{ backgroundImage: `url(${draft.cover})` }}>
                  <div className="profile-media-shade" />
                  <img src={draft.photo} alt="" />
                  <div>
                    <strong>{draft.name}</strong>
                    <small>{draft.career}</small>
                    <span>{draft.campus}</span>
                  </div>
                </div>

                <div className="profile-media-actions">
                  <label>
                    <ProfileGlyph type="edit" />
                    Cambiar foto
                    <input type="file" accept="image/*" onChange={(event) => handleImageUpload("photo", event.target.files?.[0] ?? null)} />
                  </label>
                  <label>
                    <ProfileGlyph type="eye" />
                    Cambiar portada
                    <input type="file" accept="image/*" onChange={(event) => handleImageUpload("cover", event.target.files?.[0] ?? null)} />
                  </label>
                </div>
                {actionMessage ? <p className="profile-action-feedback" role="status">{actionMessage}</p> : null}
              </section>

              <div className="profile-editor-grid">
                <EditorField label="Nombre" value={draft.name} onChange={(value) => onUpdate("name", value)} />
                <EditorField label="Carrera / rol" value={draft.career} onChange={(value) => onUpdate("career", value)} />
                <EditorField label="Campus" value={draft.campus} onChange={(value) => onUpdate("campus", value)} />
                <EditorField label="URL de foto" helper="Tambien podes pegar un link de imagen." value={draft.photo} onChange={(value) => onUpdate("photo", value)} />
                <EditorField label="URL de portada" helper="Tambien podes pegar un link de imagen." value={draft.cover} onChange={(value) => onUpdate("cover", value)} />
                <ChoiceGroup
                  label="Actitud"
                  value={draft.attitude}
                  options={[
                    { value: "Colaborador", label: "Colaborador" },
                    { value: "Explorador", label: "Explorador" },
                    { value: "Conector", label: "Conector" }
                  ]}
                  onChange={(value) => onUpdate("attitude", value)}
                />
                <EditorField label="Frase del perfil" value={draft.quote} multiline onChange={(value) => onUpdate("quote", value)} />
                <EditorField label="Sobre mi" value={draft.bio} multiline onChange={(value) => onUpdate("bio", value)} />
                <label className="profile-editor-field profile-editor-range">
                  <span>
                    Perfil completado <b>{draft.completion}%</b>
                  </span>
                  <input type="range" min="0" max="100" value={draft.completion} onChange={(event) => onUpdate("completion", Number(event.target.value))} />
                </label>
              </div>
            </div>
          ) : null}

          {activeTab === "personal" ? (
            <div className="profile-editor-grid">
              <EditorField label="Ciudad" value={draft.city} onChange={(value) => onUpdate("city", value)} />
              <EditorField label="Disponibilidad" value={draft.availability} onChange={(value) => onUpdate("availability", value)} />
              <EditorField label="Email" value={draft.email} type="email" onChange={(value) => onUpdate("email", value)} />
              <EditorField label="Telefono" value={draft.phone} onChange={(value) => onUpdate("phone", value)} />
              <EditorField label="Idiomas" value={draft.languages} multiline onChange={(value) => onUpdate("languages", value)} />
            </div>
          ) : null}

          {activeTab === "interests" ? (
            <div className="profile-editor-grid">
              <EditorField label="Intereses" helper="Separalos con comas." value={draft.interests} multiline onChange={(value) => onUpdate("interests", value)} />
              <EditorField label="Habilidades" helper="Separalas con comas." value={draft.skills} multiline onChange={(value) => onUpdate("skills", value)} />
              <div className="profile-editor-preview">
                <strong>Vista previa</strong>
                <div className="profile-chip-list">
                  {toTags(`${draft.interests}, ${draft.skills}`).slice(0, 10).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "socials" ? (
            <div className="profile-editor-grid">
              <EditorField label="Instagram" value={draft.instagram} onChange={(value) => onUpdate("instagram", value)} />
              <EditorField label="LinkedIn" value={draft.linkedin} onChange={(value) => onUpdate("linkedin", value)} />
              <EditorField label="GitHub" value={draft.github} onChange={(value) => onUpdate("github", value)} />
              <EditorField label="Portfolio" value={draft.portfolio} onChange={(value) => onUpdate("portfolio", value)} />
            </div>
          ) : null}

          {activeTab === "preferences" ? (
            <div className="profile-preferences-panel">
              <section className="profile-setting-section">
                <ProfileSettingTitle icon="bell" title="Notificaciones" text="Elegis que alertas recibir y con que frecuencia." />
                <ToggleRow
                  title="Activar notificaciones"
                  text="Pausa o reactiva todas tus alertas."
                  checked={draft.notificationsEnabled}
                  onChange={(checked) => onUpdate("notificationsEnabled", checked)}
                />
                <div className="profile-toggle-grid">
                  <ToggleRow title="Eventos" text="Recordatorios y cambios de agenda." checked={draft.notifyEvents} disabled={!draft.notificationsEnabled} onChange={(checked) => onUpdate("notifyEvents", checked)} />
                  <ToggleRow title="Comunidades" text="Novedades de grupos donde participas." checked={draft.notifyCommunities} disabled={!draft.notificationsEnabled} onChange={(checked) => onUpdate("notifyCommunities", checked)} />
                  <ToggleRow title="Mensajes" text="Avisos de contactos y solicitudes." checked={draft.notifyMessages} disabled={!draft.notificationsEnabled} onChange={(checked) => onUpdate("notifyMessages", checked)} />
                </div>
                <ChoiceGroup
                  label="Frecuencia"
                  value={draft.notificationFrequency}
                  disabled={!draft.notificationsEnabled}
                  options={[
                    { value: "instant", label: "Al instante" },
                    { value: "daily", label: "Diario" },
                    { value: "weekly", label: "Semanal" }
                  ]}
                  onChange={(value) => onUpdate("notificationFrequency", value)}
                />
              </section>

              <section className="profile-setting-section">
                <ProfileSettingTitle icon="lock" title="Privacidad" text="Controla quien ve tu perfil y como pueden contactarte." />
                <ChoiceGroup
                  label="Visibilidad del perfil"
                  value={draft.profileVisibility}
                  options={[
                    { value: "public", label: "Publico" },
                    { value: "contacts", label: "Contactos" },
                    { value: "private", label: "Privado" }
                  ]}
                  onChange={(value) => onUpdate("profileVisibility", value)}
                />
                <ChoiceGroup
                  label="Quien puede escribirte"
                  value={draft.allowContact}
                  options={[
                    { value: "everyone", label: "Todos" },
                    { value: "contacts", label: "Contactos" },
                    { value: "none", label: "Nadie" }
                  ]}
                  onChange={(value) => onUpdate("allowContact", value)}
                />
                <div className="profile-toggle-grid">
                  <ToggleRow title="Mostrar email" text={draft.email} checked={draft.showEmail} onChange={(checked) => onUpdate("showEmail", checked)} />
                  <ToggleRow title="Mostrar telefono" text={draft.phone} checked={draft.showPhone} onChange={(checked) => onUpdate("showPhone", checked)} />
                </div>
              </section>

              <section className="profile-setting-section">
                <ProfileSettingTitle icon="user" title="Cuenta" text="Ajustes de seguridad y datos de inicio de sesion." />
                <ToggleRow title="Verificacion en dos pasos" text="Protege el acceso con una capa extra." checked={draft.twoFactorEnabled} onChange={(checked) => onUpdate("twoFactorEnabled", checked)} />
                <ToggleRow title="Alertas de sesion" text="Recibi avisos si tu cuenta se abre en otro dispositivo." checked={draft.sessionAlerts} onChange={(checked) => onUpdate("sessionAlerts", checked)} />
                <div className="profile-account-actions">
                  <button type="button" onClick={() => setActionMessage("Te enviamos un enlace para cambiar la contrasena.")}>Cambiar contrasena</button>
                  <button type="button" onClick={() => setActionMessage("Tus datos quedaron listos para descargar.")}>Descargar datos</button>
                  <button className="is-danger" type="button" onClick={() => setActionMessage("Sesion cerrada en esta demo.")}>Cerrar sesion</button>
                </div>
                {actionMessage ? <p className="profile-action-feedback" role="status">{actionMessage}</p> : null}
              </section>

              <section className="profile-setting-section">
                <ProfileSettingTitle icon="bookmark" title="Contenido guardado" text="Define que tipos de guardados aparecen en tu perfil." />
                <div className="profile-toggle-grid">
                  <ToggleRow title="Eventos guardados" text="Fechas y actividades marcadas." checked={draft.savedEventsEnabled} onChange={(checked) => onUpdate("savedEventsEnabled", checked)} />
                  <ToggleRow title="Comunidades guardadas" text="Grupos para revisar despues." checked={draft.savedCommunitiesEnabled} onChange={(checked) => onUpdate("savedCommunitiesEnabled", checked)} />
                  <ToggleRow title="Publicaciones guardadas" text="Posts y recursos destacados." checked={draft.savedPostsEnabled} onChange={(checked) => onUpdate("savedPostsEnabled", checked)} />
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "public" ? (
            <div className="profile-public-preview">
              <img src={draft.photo} alt="" />
              <div>
                <h4>{draft.name}</h4>
                <p>{draft.career}</p>
                <span>{draft.campus}</span>
              </div>
              <blockquote>{draft.quote}</blockquote>
              <div className="profile-public-stats">
                <span>{joinedCount} comunidades</span>
                <span>{signedEventsCount} eventos</span>
                <span>{draft.completion}% completo</span>
              </div>
              <div className="profile-chip-list">
                {toTags(draft.interests).slice(0, 6).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="profile-editor-footer">
          <button type="button" onClick={onClose}>Cancelar</button>
          <button className="is-primary" type="submit">{activeTab === "public" ? "Cerrar vista" : "Guardar cambios"}</button>
        </div>
      </form>
    </div>
  );
}

function EditorField({
  label,
  value,
  helper,
  type = "text",
  multiline = false,
  onChange
}: {
  label: string;
  value: string;
  helper?: string;
  type?: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="profile-editor-field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} rows={4} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
      {helper ? <small>{helper}</small> : null}
    </label>
  );
}

function ProfileSettingTitle({ icon, title, text }: { icon: Glyph; title: string; text: string }) {
  return (
    <div className="profile-setting-title">
      <span>
        <ProfileGlyph type={icon} />
      </span>
      <div>
        <strong>{title}</strong>
        <small>{text}</small>
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  text,
  checked,
  disabled = false,
  onChange
}: {
  title: string;
  text: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`profile-toggle-row${disabled ? " is-disabled" : ""}`}>
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}

function ChoiceGroup({
  label,
  value,
  options,
  disabled = false,
  onChange
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="profile-choice-group" disabled={disabled}>
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <label className={value === option.value ? "is-selected" : ""} key={option.value}>
            <input type="radio" name={label} value={option.value} checked={value === option.value} onChange={(event) => onChange(event.target.value)} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function loadProfileSettings(): EditableProfile {
  if (typeof window === "undefined") return defaultProfileSettings;

  try {
    const storedProfile = window.localStorage.getItem(profileStorageKey);
    if (!storedProfile) return defaultProfileSettings;
    return normalizeProfile(JSON.parse(storedProfile) as Partial<EditableProfile>);
  } catch {
    return defaultProfileSettings;
  }
}

function normalizeProfile(profile: Partial<EditableProfile>): EditableProfile {
  const merged = { ...defaultProfileSettings, ...profile };
  const completion = Number.isFinite(Number(merged.completion)) ? Math.round(Number(merged.completion)) : defaultProfileSettings.completion;

  return {
    ...merged,
    name: cleanText(merged.name, defaultProfileSettings.name),
    career: cleanText(merged.career, defaultProfileSettings.career),
    photo: cleanText(merged.photo, defaultProfileSettings.photo),
    cover: cleanText(merged.cover, defaultProfileSettings.cover),
    campus: cleanText(merged.campus, defaultProfileSettings.campus),
    quote: cleanText(merged.quote, defaultProfileSettings.quote),
    bio: cleanText(merged.bio, defaultProfileSettings.bio),
    attitude: cleanText(merged.attitude, defaultProfileSettings.attitude),
    completion: Math.min(100, Math.max(0, completion)),
    city: cleanText(merged.city, defaultProfileSettings.city),
    languages: cleanText(merged.languages, defaultProfileSettings.languages),
    availability: cleanText(merged.availability, defaultProfileSettings.availability),
    email: cleanText(merged.email, defaultProfileSettings.email),
    phone: cleanText(merged.phone, defaultProfileSettings.phone),
    interests: cleanText(merged.interests, defaultProfileSettings.interests),
    skills: cleanText(merged.skills, defaultProfileSettings.skills),
    notifications: cleanText(merged.notifications, defaultProfileSettings.notifications),
    privacy: cleanText(merged.privacy, defaultProfileSettings.privacy),
    account: cleanText(merged.account, defaultProfileSettings.account),
    saved: cleanText(merged.saved, defaultProfileSettings.saved),
    notificationsEnabled: toBoolean(merged.notificationsEnabled, defaultProfileSettings.notificationsEnabled),
    notifyEvents: toBoolean(merged.notifyEvents, defaultProfileSettings.notifyEvents),
    notifyCommunities: toBoolean(merged.notifyCommunities, defaultProfileSettings.notifyCommunities),
    notifyMessages: toBoolean(merged.notifyMessages, defaultProfileSettings.notifyMessages),
    notificationFrequency: toOption(merged.notificationFrequency, ["instant", "daily", "weekly"], defaultProfileSettings.notificationFrequency),
    profileVisibility: toOption(merged.profileVisibility, ["public", "contacts", "private"], defaultProfileSettings.profileVisibility),
    allowContact: toOption(merged.allowContact, ["everyone", "contacts", "none"], defaultProfileSettings.allowContact),
    showEmail: toBoolean(merged.showEmail, defaultProfileSettings.showEmail),
    showPhone: toBoolean(merged.showPhone, defaultProfileSettings.showPhone),
    twoFactorEnabled: toBoolean(merged.twoFactorEnabled, defaultProfileSettings.twoFactorEnabled),
    sessionAlerts: toBoolean(merged.sessionAlerts, defaultProfileSettings.sessionAlerts),
    savedEventsEnabled: toBoolean(merged.savedEventsEnabled, defaultProfileSettings.savedEventsEnabled),
    savedCommunitiesEnabled: toBoolean(merged.savedCommunitiesEnabled, defaultProfileSettings.savedCommunitiesEnabled),
    savedPostsEnabled: toBoolean(merged.savedPostsEnabled, defaultProfileSettings.savedPostsEnabled)
  };
}

function cleanText(value: string | undefined, fallback: string): string {
  return value?.trim() ? value.trim() : fallback;
}

function toBoolean(value: boolean | undefined, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function toOption<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === "string" && options.includes(value as T) ? value as T : fallback;
}

function summarizeNotifications(profile: EditableProfile): string {
  if (!profile.notificationsEnabled) return "Alertas pausadas";

  const activeChannels = [
    profile.notifyEvents && "eventos",
    profile.notifyCommunities && "comunidades",
    profile.notifyMessages && "mensajes"
  ].filter(Boolean).length;

  return `${activeChannels} alertas activas - ${frequencyLabel(profile.notificationFrequency)}`;
}

function summarizePrivacy(profile: EditableProfile): string {
  return `${visibilityLabel(profile.profileVisibility)} - mensajes: ${contactLabel(profile.allowContact)}`;
}

function summarizeAccount(profile: EditableProfile): string {
  return profile.twoFactorEnabled ? "2FA activa y alertas de sesion" : "Datos y seguridad";
}

function summarizeSaved(profile: EditableProfile): string {
  const savedTypes = [
    profile.savedEventsEnabled && "eventos",
    profile.savedCommunitiesEnabled && "comunidades",
    profile.savedPostsEnabled && "posts"
  ].filter(Boolean);

  return savedTypes.length ? savedTypes.join(", ") : "Sin contenido visible";
}

function frequencyLabel(value: NotificationFrequency): string {
  const labels: Record<NotificationFrequency, string> = {
    instant: "al instante",
    daily: "resumen diario",
    weekly: "resumen semanal"
  };

  return labels[value];
}

function visibilityLabel(value: ProfileVisibility): string {
  const labels: Record<ProfileVisibility, string> = {
    public: "Perfil publico",
    contacts: "Solo contactos",
    private: "Perfil privado"
  };

  return labels[value];
}

function contactLabel(value: ContactPermission): string {
  const labels: Record<ContactPermission, string> = {
    everyone: "todos",
    contacts: "contactos",
    none: "nadie"
  };

  return labels[value];
}

function toTags(value: string): string[] {
  const tags = value
    .split(/[,\n]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  return tags.length ? tags : ["Sin datos"];
}

function ProfileGlyph({ type }: { type: Glyph }) {
  const paths: Record<Glyph, string> = {
    badge: "M7.5 12.5 11 16l6-7M8 4.5h8l4 4-8 11-8-11 4-4z",
    bell: "M18.4 9.9c0-3.4-2.1-5.8-5.1-6.4a1.35 1.35 0 0 0-2.6 0c-3 .6-5.1 3-5.1 6.4v2.7c0 1.1-.5 2.1-1.3 2.8-.5.4-.2 1.2.5 1.2h14.4c.7 0 1-.8.5-1.2-.8-.7-1.3-1.7-1.3-2.8V9.9zM9.7 18.5c.3 1 1.2 1.7 2.3 1.7s2-.7 2.3-1.7",
    bookmark: "M6 4.8c0-.7.5-1.2 1.2-1.2h9.6c.7 0 1.2.5 1.2 1.2v15l-6-3.5-6 3.5v-15z",
    calendar: "M7 3v3M17 3v3M4.5 9h15M6 5h12c1 0 1.8.8 1.8 1.8v10.7c0 1-.8 1.8-1.8 1.8H6c-1 0-1.8-.8-1.8-1.8V6.8C4.2 5.8 5 5 6 5z",
    check: "M20 6 9 17l-5-5",
    chevron: "m9 5 7 7-7 7",
    clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
    edit: "M4 20h4l10.5-10.5a2.4 2.4 0 0 0-3.4-3.4L4.6 16.6 4 20zM13.5 7.5l3 3",
    eye: "M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6zM12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z",
    globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.6 12h16.8M12 3c2.2 2.4 3.3 5.4 3.3 9S14.2 18.6 12 21M12 3C9.8 5.4 8.7 8.4 8.7 12s1.1 6.6 3.3 9",
    heart: "M20.4 5.9a5 5 0 0 0-7.1 0L12 7.2l-1.3-1.3a5 5 0 1 0-7.1 7.1l8.4 8 8.4-8a5 5 0 0 0 0-7.1z",
    link: "M10 13a5 5 0 0 0 7.1 0l2.1-2.1a5 5 0 0 0-7.1-7.1L10.9 5M14 11a5 5 0 0 0-7.1 0l-2.1 2.1a5 5 0 0 0 7.1 7.1l1.2-1.2",
    lock: "M7 10V7a5 5 0 0 1 10 0v3M6 10h12v10H6V10z",
    map: "M12 21s6-5.1 6-11a6 6 0 0 0-12 0c0 5.9 6 11 6 11zM12 12.3a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6z",
    phone: "M6.7 3.8 9 3.3l2.2 5-1.7 1.1a12.7 12.7 0 0 0 5.1 5.1l1.1-1.7 5 2.2-.5 2.3c-.2.9-1 1.5-1.9 1.4C10.8 18.2 5.8 13.2 5.3 5.7c-.1-.9.5-1.7 1.4-1.9z",
    settings: "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a8.5 8.5 0 0 0-2.5-1.5L14.2 2h-4.4l-.3 3a8.5 8.5 0 0 0-2.5 1.5l-2.4-1-2 3.5 2 1.5c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.5 2 3.5 2.4-1a8.5 8.5 0 0 0 2.5 1.5l.3 3h4.4l.3-3a8.5 8.5 0 0 0 2.5-1.5l2.4 1 2-3.5-2-1.5z",
    share: "M18 8a3 3 0 1 0-2.8-4M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM18 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM8.7 14.2l6.6-4.4M8.7 17.8l6.6 4.4",
    star: "m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3-4.6-4.5 6.4-.9L12 3z",
    trophy: "M8 4h8v3a4 4 0 0 1-8 0V4zM6 5H3v2a4 4 0 0 0 4 4M18 5h3v2a4 4 0 0 1-4 4M12 11v5M8.5 21h7M10 16h4v5h-4v-5z",
    user: "M12 12.4a4.7 4.7 0 1 0 0-9.4 4.7 4.7 0 0 0 0 9.4zM4.3 20.7c.5-4 3.7-6.7 7.7-6.7s7.2 2.7 7.7 6.7",
    users: "M8.2 11.4a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4zM16.5 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.7 20.4c.4-3.1 2.7-5.4 5.5-5.4s5.1 2.3 5.5 5.4M14.9 21h5.9c.4 0 .7-.4.6-.8-.3-2.7-2.4-4.8-4.9-4.8"
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d={paths[type]} />
    </svg>
  );
}

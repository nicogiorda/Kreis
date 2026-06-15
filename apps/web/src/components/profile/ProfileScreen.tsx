import { GearSix, PencilSimple, SignOut } from "@phosphor-icons/react";
import { AltArrowRight, MapPoint, UsersGroupRounded } from "@solar-icons/react";
import { useMemo, useState } from "react";
import type { KreisUserProfile } from "../../api/users";
import type { Community, KreisEvent, ThemeMode } from "../../types";
import { cn } from "../../utils/cn";
import { ThemeToggleIcon } from "../common/Icons";
import { LoadingState } from "../common/LoadingState";

type ProfileTab = "created-events" | "interested-events" | "communities";

type ProfileScreenProps = {
  profile: KreisUserProfile | null;
  profileEmail?: string;
  profileLoadStatus: "loading" | "ready" | "error";
  events: KreisEvent[];
  communities: Community[];
  themeMode: ThemeMode;
  onOpenEventDetails: (eventId: string) => void;
  onToggleTheme: () => void;
  onLogout: () => void;
};

const profileTabs: Array<{ id: ProfileTab; label: string }> = [
  { id: "created-events", label: "Mis eventos" },
  { id: "interested-events", label: "Me interesan" },
  { id: "communities", label: "Comunidades" }
];

function getTabIndex(tab: ProfileTab): number {
  return profileTabs.findIndex((item) => item.id === tab);
}

function getEventDateParts(event: KreisEvent): { day: string; month: string } {
  return {
    day: event.day || String(Number(new Date(event.date).getDate()) || ""),
    month: event.month || ""
  };
}

function ProfileEventRow({ event, onOpen }: { event: KreisEvent; onOpen: (eventId: string) => void }) {
  const { day, month } = getEventDateParts(event);

  return (
    <article className="grid min-h-[71px] overflow-hidden rounded-[21px] bg-kreis-event-surface text-kreis-ink">
      <div className="grid min-h-[71px] grid-cols-[53px_minmax(0,1fr)_24px] items-center gap-[12px] px-[10px] py-[9px]">
        <div className="home-event-date-chip grid size-[53px] content-center justify-items-center rounded-[16px] bg-[var(--date-chip-bg)] text-[var(--date-chip-ink)]">
          <strong className="block text-[18px] font-bold leading-[18px]">{day}</strong>
          <span className="block text-[11px] font-bold leading-[13px] uppercase">{month}</span>
        </div>

        <div className="grid min-w-0 gap-[4px]">
          <h3 className="m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[16px] font-medium leading-[19px]">
            {event.title}
          </h3>
          <p className="m-0 inline-flex min-w-0 items-center gap-[4px] text-[13px] font-normal leading-[16px] text-kreis-muted">
            <MapPoint className="size-[12px] flex-none" weight="Outline" aria-hidden="true" />
            <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{event.place}</span>
          </p>
        </div>

        <button
          className="grid size-6 place-items-center border-0 bg-transparent p-0 text-kreis-muted shadow-none transition-transform duration-150 ease-out active:scale-95"
          type="button"
          aria-label={`Ver detalles de ${event.title}`}
          onClick={() => onOpen(event.id)}
        >
          <AltArrowRight className="size-[18px]" weight="Outline" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function ProfileCommunityRow({ community }: { community: Community }) {
  return (
    <article className="grid min-h-[71px] overflow-hidden rounded-[21px] bg-kreis-event-surface text-kreis-ink">
      <div className="grid min-h-[71px] grid-cols-[53px_minmax(0,1fr)_24px] items-center gap-[12px] px-[10px] py-[9px]">
        <span className="grid size-[53px] place-items-center rounded-[16px] bg-[var(--date-chip-bg)] text-[20px] font-bold leading-none text-[var(--date-chip-ink)]" aria-hidden="true">
          {community.icon || <UsersGroupRounded className="size-[24px]" weight="BoldDuotone" />}
        </span>

        <div className="grid min-w-0 gap-[4px]">
          <h3 className="m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[16px] font-medium leading-[19px]">
            {community.name}
          </h3>
          <p className="m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-normal leading-[16px] text-kreis-muted">
            {community.members} miembros
          </p>
        </div>

        <AltArrowRight className="size-[18px] justify-self-center text-kreis-muted" weight="Outline" aria-hidden="true" />
      </div>
    </article>
  );
}

function ProfileEmptyContent({ text }: { text: string }) {
  return (
    <div className="grid min-h-[71px] place-items-center rounded-[21px] bg-kreis-event-surface px-5 text-center text-[13px] font-normal leading-[17px] text-kreis-muted">
      {text}
    </div>
  );
}

export function ProfileScreen({
  profile,
  profileEmail,
  profileLoadStatus,
  events,
  communities,
  themeMode,
  onOpenEventDetails,
  onToggleTheme,
  onLogout
}: ProfileScreenProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("created-events");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const displayName = profile?.name || "Mi perfil";
  const facultyLabel = profile?.faculty ? `UADE | ${profile.faculty}` : "UADE";
  const joinedCommunities = useMemo(
    () => communities.filter((community) => community.joined && community.status !== "Pendiente"),
    [communities]
  );
  const createdEvents = useMemo(() => {
    const createdCount = profile?.stats.createdEvents ?? 0;
    if (!createdCount) return [];
    return events.slice(0, createdCount);
  }, [events, profile?.stats.createdEvents]);
  const interestedEvents = useMemo(() => events.filter((event) => event.interested), [events]);
  const activeIndex = Math.max(0, getTabIndex(activeTab));
  const nextThemeLabel = themeMode === "dark" ? "Modo claro" : "Modo oscuro";

  return (
    <section className="mx-auto w-full max-w-[357px] animate-[rise_220ms_ease-out] pb-6 pt-[max(64px,calc(env(safe-area-inset-top)+12px))] text-kreis-ink" data-screen="profile">
      <div className="relative flex h-[37px] items-center justify-between">
        <h1 className="m-0 text-[18px] font-medium leading-[15px] text-kreis-ink">Mi Perfil</h1>
        <button
          className="grid size-[37px] place-items-center rounded-[12px] border-0 bg-kreis-event-surface p-0 text-kreis-cream shadow-none transition-transform duration-150 ease-out active:scale-95"
          type="button"
          aria-expanded={settingsOpen}
          aria-label="Abrir configuracion"
          onClick={() => setSettingsOpen((current) => !current)}
        >
          <GearSix className="size-[25px]" weight="regular" aria-hidden="true" />
        </button>

        {settingsOpen ? (
          <div className="absolute right-0 top-[45px] z-30 grid w-[186px] overflow-hidden rounded-[18px] bg-kreis-surface shadow-kreis-soft">
            <button
              className="flex h-[46px] items-center gap-3 border-0 bg-transparent px-4 text-left text-[14px] font-medium leading-[17px] text-kreis-ink shadow-none"
              type="button"
              aria-label={`Cambiar a ${nextThemeLabel}`}
              onClick={() => {
                setSettingsOpen(false);
                onToggleTheme();
              }}
            >
              <span className="grid size-7 place-items-center rounded-full bg-kreis-event-surface text-kreis-muted [&_svg]:size-[16px]">
                <ThemeToggleIcon themeMode={themeMode} />
              </span>
              {nextThemeLabel}
            </button>
            <button
              className="flex h-[46px] items-center gap-3 border-0 bg-transparent px-4 text-left text-[14px] font-medium leading-[17px] text-kreis-ink shadow-none"
              type="button"
              onClick={onLogout}
            >
              <span className="grid size-7 place-items-center rounded-full bg-kreis-event-surface text-kreis-muted">
                <SignOut className="size-[16px]" weight="regular" aria-hidden="true" />
              </span>
              Cerrar sesion
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-[16px] grid justify-items-center">
        <div className="relative size-[106px]">
          <div className="grid size-[106px] overflow-hidden rounded-full bg-kreis-event-surface">
            {profile?.avatarUrl ? (
              <img className="size-full object-cover" src={profile.avatarUrl} alt="" loading="lazy" decoding="async" />
            ) : null}
          </div>
          <button
            className="absolute bottom-[3px] right-0 grid size-7 place-items-center rounded-full border-0 bg-kreis-orange p-0 text-kreis-cream shadow-none transition-transform duration-150 ease-out active:scale-95"
            type="button"
            aria-label="Editar foto de perfil"
            title="La edicion de foto estara disponible proximamente"
          >
            <PencilSimple className="size-[14px]" weight="bold" aria-hidden="true" />
          </button>
        </div>

        <h2 className="m-0 mt-[13px] max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-[24px] font-bold leading-[30px] text-kreis-ink">
          {displayName}
        </h2>

        {profileLoadStatus === "loading" ? (
          <LoadingState label="Cargando perfil" variant="inline" className="mt-[8px]" />
        ) : (
          <>
            <p className="m-0 mt-[4px] max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-[16px] font-medium leading-[15px] text-kreis-muted">
              {facultyLabel}
            </p>
            {profileEmail ? (
              <p className="m-0 mt-[10px] max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-[13px] font-normal leading-[15px] text-kreis-muted">
                {profileEmail}
              </p>
            ) : null}
          </>
        )}

        {profileLoadStatus === "error" ? (
          <p className="m-0 mt-[10px] text-center text-[12px] font-normal leading-[15px] text-kreis-muted">No pudimos cargar todos tus datos.</p>
        ) : null}
      </div>

      <div className="relative mt-[19px] grid h-[25px] grid-cols-3 overflow-hidden rounded-[10px] bg-kreis-event-surface" role="tablist" aria-label="Contenido de perfil">
        <span
          className="absolute bottom-0 left-0 top-0 z-0 w-1/3 rounded-[10px] bg-kreis-orange transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
          aria-hidden="true"
        />
        {profileTabs.map((tab) => {
          const active = tab.id === activeTab;

          return (
            <button
              className={cn(
                "relative z-[1] min-w-0 rounded-[10px] border-0 bg-transparent px-1 text-center text-[13px] font-medium leading-[15px] shadow-none transition-colors duration-150",
                active ? "text-kreis-cream" : "text-kreis-muted"
              )}
              type="button"
              role="tab"
              aria-selected={active}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <section className="mt-[26px] grid gap-[10px]" role="tabpanel" aria-label={profileTabs[activeIndex]?.label}>
        {activeTab === "created-events" ? (
          createdEvents.length ? createdEvents.map((event) => (
            <ProfileEventRow event={event} key={event.id} onOpen={onOpenEventDetails} />
          )) : (
            <ProfileEmptyContent text="Todavia no creaste eventos." />
          )
        ) : null}

        {activeTab === "interested-events" ? (
          interestedEvents.length ? interestedEvents.map((event) => (
            <ProfileEventRow event={event} key={event.id} onOpen={onOpenEventDetails} />
          )) : (
            <ProfileEmptyContent text="Todavia no marcaste eventos." />
          )
        ) : null}

        {activeTab === "communities" ? (
          joinedCommunities.length ? joinedCommunities.map((community) => (
            <ProfileCommunityRow community={community} key={community.id} />
          )) : (
            <ProfileEmptyContent text="Todavia no te uniste a comunidades." />
          )
        ) : null}
      </section>
    </section>
  );
}

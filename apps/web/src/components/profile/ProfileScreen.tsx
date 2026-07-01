import { ArrowLeft, CaretRight, Devices, Eye, EyeSlash, GearSix, Key, PencilSimple, ShieldCheck, SignOut } from "@phosphor-icons/react";
import { AltArrowRight, MapPoint, UsersGroupRounded } from "@solar-icons/react";
import { type ChangeEvent, useMemo, useRef, useState } from "react";
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
  onUploadAvatar: (file: File) => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onSignOutOtherDevices: () => Promise<void>;
  onSignOutEverywhere: () => Promise<void>;
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

function getChangePasswordErrorMessage(error: unknown): string {
  const authError = error as { code?: string; message?: string };
  const errorText = `${authError.code ?? ""} ${authError.message ?? ""}`.toLowerCase();

  if (errorText.includes("current") || errorText.includes("invalid_credentials")) {
    return "La contraseña actual no es correcta.";
  }

  if (errorText.includes("same_password")) return "La nueva contraseña debe ser diferente.";
  if (errorText.includes("weak")) return "La nueva contraseña no cumple los requisitos.";

  return "No pudimos cambiar la contraseña. Intentá nuevamente.";
}

function SecurityPasswordField({
  autoComplete,
  label,
  value,
  visible,
  onChange,
  onToggle
}: {
  autoComplete: "current-password" | "new-password";
  label: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <label className="grid gap-1.5 text-[13px] font-medium text-kreis-muted">
      {label}
      <span className="relative block">
        <input
          className="h-[42px] w-full rounded-[15px] border-0 bg-kreis-event-surface px-4 pr-12 text-[15px] font-normal text-kreis-ink outline-none focus:ring-2 focus:ring-[rgba(240,83,28,0.22)]"
          type={visible ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          className="absolute inset-y-0 right-1 grid w-10 place-items-center border-0 bg-transparent p-0 text-kreis-muted"
          type="button"
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          onClick={onToggle}
        >
          {visible ? <EyeSlash className="size-[18px]" aria-hidden="true" /> : <Eye className="size-[18px]" aria-hidden="true" />}
        </button>
      </span>
    </label>
  );
}

function AccountSecurityPanel({
  email,
  onChangePassword,
  onClose,
  onSignOutEverywhere,
  onSignOutOtherDevices
}: {
  email?: string;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onClose: () => void;
  onSignOutEverywhere: () => Promise<void>;
  onSignOutOtherDevices: () => Promise<void>;
}) {
  const [view, setView] = useState<"menu" | "change-password">("menu");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [otherSessionsClosed, setOtherSessionsClosed] = useState(true);
  const [confirmEverywhere, setConfirmEverywhere] = useState(false);
  const hasNoEdgeSpaces = newPassword === newPassword.trim();
  const formIsValid =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword !== currentPassword &&
    hasNoEdgeSpaces &&
    newPassword === confirmation;

  function clearPasswordFields(): void {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmation("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirmation(false);
  }

  async function handleChangePassword(): Promise<void> {
    if (!formIsValid) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await onChangePassword(currentPassword, newPassword);

      try {
        await onSignOutOtherDevices();
        setOtherSessionsClosed(true);
        setSuccess("Contraseña actualizada. Las demás sesiones fueron cerradas.");
      } catch {
        setOtherSessionsClosed(false);
        setSuccess("Contraseña actualizada correctamente.");
      }

      clearPasswordFields();
    } catch (changeError) {
      setError(getChangePasswordErrorMessage(changeError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetryOtherSessions(): Promise<void> {
    setSubmitting(true);
    setError(null);

    try {
      await onSignOutOtherDevices();
      setOtherSessionsClosed(true);
      setSuccess("Las demás sesiones fueron cerradas.");
    } catch {
      setError("No pudimos cerrar las demás sesiones.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOutEverywhere(): Promise<void> {
    setSubmitting(true);
    setError(null);

    try {
      await onSignOutEverywhere();
    } catch {
      setError("No pudimos cerrar las sesiones. Intentá nuevamente.");
      setSubmitting(false);
    }
  }

  return (
    <section className="fixed inset-0 z-[70] overflow-y-auto bg-kreis-app-bg text-kreis-ink" aria-label="Cuenta y seguridad">
      <div className="mx-auto min-h-full w-full max-w-[430px] px-[22px] pb-[max(28px,env(safe-area-inset-bottom))] pt-[max(54px,calc(env(safe-area-inset-top)+14px))]">
        <header className="grid grid-cols-[37px_minmax(0,1fr)_37px] items-center">
          <button
            className="grid size-[37px] place-items-center rounded-[12px] border-0 bg-kreis-event-surface p-0 text-kreis-ink"
            type="button"
            aria-label={view === "change-password" ? "Volver a cuenta y seguridad" : "Cerrar cuenta y seguridad"}
            onClick={() => {
              setError(null);
              setSuccess(null);
              if (view === "change-password") {
                clearPasswordFields();
                setView("menu");
              } else {
                onClose();
              }
            }}
          >
            <ArrowLeft className="size-[21px]" aria-hidden="true" />
          </button>
          <h1 className="m-0 text-center text-[18px] font-medium leading-[22px]">
            {view === "change-password" ? "Cambiar contraseña" : "Cuenta y seguridad"}
          </h1>
        </header>

        {view === "menu" ? (
          <div className="mt-8">
            <div className="flex items-center gap-3 border-b border-kreis-line pb-5">
              <span className="grid size-11 flex-none place-items-center rounded-[15px] bg-kreis-event-surface text-kreis-orange">
                <ShieldCheck className="size-6" weight="regular" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <strong className="block text-[16px] font-medium">Tu cuenta</strong>
                <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-kreis-muted">{email}</span>
              </div>
            </div>

            <button
              className="mt-4 grid min-h-[62px] w-full grid-cols-[42px_minmax(0,1fr)_20px] items-center gap-3 rounded-[18px] border-0 bg-kreis-event-surface px-3 text-left text-kreis-ink"
              type="button"
              aria-label="Cambiar contraseña"
              onClick={() => {
                setError(null);
                setSuccess(null);
                setView("change-password");
              }}
            >
              <span className="grid size-[42px] place-items-center rounded-[14px] bg-kreis-app-bg text-kreis-orange">
                <Key className="size-[20px]" aria-hidden="true" />
              </span>
              <span>
                <strong className="block text-[15px] font-medium">Cambiar contraseña</strong>
                <small className="mt-0.5 block text-[12px] font-normal text-kreis-muted">Verificá tu contraseña actual</small>
              </span>
              <CaretRight className="size-[18px] text-kreis-muted" aria-hidden="true" />
            </button>

            <div className="mt-3 rounded-[18px] bg-kreis-event-surface p-3">
              <div className="flex items-center gap-3">
                <span className="grid size-[42px] flex-none place-items-center rounded-[14px] bg-kreis-app-bg text-kreis-muted">
                  <Devices className="size-[20px]" aria-hidden="true" />
                </span>
                <div>
                  <strong className="block text-[15px] font-medium">Sesiones activas</strong>
                  <small className="mt-0.5 block text-[12px] font-normal text-kreis-muted">Cerrá Kreis en todos tus dispositivos</small>
                </div>
              </div>
              {confirmEverywhere ? (
                <div className="mt-3 border-t border-kreis-line pt-3">
                  <p className="m-0 text-[13px] leading-[17px] text-kreis-muted">También se cerrará la sesión de este dispositivo.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      className="h-[37px] rounded-[14px] border-0 bg-kreis-app-bg text-[13px] font-medium text-kreis-ink"
                      type="button"
                      disabled={submitting}
                      onClick={() => setConfirmEverywhere(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      className="h-[37px] rounded-[14px] border-0 bg-kreis-orange text-[13px] font-medium text-kreis-cream"
                      type="button"
                      disabled={submitting}
                      onClick={() => void handleSignOutEverywhere()}
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="mt-3 h-[37px] w-full rounded-[14px] border-0 bg-kreis-app-bg text-[13px] font-medium text-kreis-ink"
                  type="button"
                  onClick={() => setConfirmEverywhere(true)}
                >
                  Cerrar todas las sesiones
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            <p className="m-0 text-[14px] leading-[19px] text-kreis-muted">
              Para proteger tu cuenta, confirmá la contraseña que usás actualmente.
            </p>
            <SecurityPasswordField
              autoComplete="current-password"
              label="Contraseña actual"
              value={currentPassword}
              visible={showCurrent}
              onChange={setCurrentPassword}
              onToggle={() => setShowCurrent((current) => !current)}
            />
            <SecurityPasswordField
              autoComplete="new-password"
              label="Nueva contraseña"
              value={newPassword}
              visible={showNew}
              onChange={setNewPassword}
              onToggle={() => setShowNew((current) => !current)}
            />
            <SecurityPasswordField
              autoComplete="new-password"
              label="Repetir nueva contraseña"
              value={confirmation}
              visible={showConfirmation}
              onChange={setConfirmation}
              onToggle={() => setShowConfirmation((current) => !current)}
            />
            <ul className="m-0 grid list-none gap-1 p-0 text-[12px] font-medium text-kreis-muted">
              <li className={cn(newPassword.length >= 8 && "text-kreis-ink")}>• Mínimo 8 caracteres</li>
              <li className={cn(hasNoEdgeSpaces && newPassword.length > 0 && "text-kreis-ink")}>• Sin espacios al inicio o al final</li>
              <li className={cn(confirmation.length > 0 && newPassword === confirmation && "text-kreis-ink")}>• Ambas contraseñas coinciden</li>
              <li className={cn(newPassword.length > 0 && newPassword !== currentPassword && "text-kreis-ink")}>• Diferente de la contraseña actual</li>
            </ul>
            <button
              className="mt-2 h-[42px] rounded-[15px] border-0 bg-kreis-orange text-[15px] font-medium text-kreis-cream disabled:opacity-50"
              type="button"
              disabled={submitting || !formIsValid}
              onClick={() => void handleChangePassword()}
            >
              {submitting ? <LoadingState label="Actualizando contraseña" variant="button" /> : "Actualizar contraseña"}
            </button>
            {success ? <p className="m-0 text-center text-[13px] leading-[17px] text-kreis-forest" role="status">{success}</p> : null}
            {!otherSessionsClosed && success ? (
              <button
                className="h-[38px] rounded-[14px] border-0 bg-kreis-event-surface text-[13px] font-medium text-kreis-ink"
                type="button"
                disabled={submitting}
                onClick={() => void handleRetryOtherSessions()}
              >
                Reintentar cierre de las demás sesiones
              </button>
            ) : null}
          </div>
        )}

        {error ? <p className="mt-5 text-center text-[13px] leading-[17px] text-kreis-orange" role="alert">{error}</p> : null}
      </div>
    </section>
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
  onUploadAvatar,
  onChangePassword,
  onSignOutOtherDevices,
  onSignOutEverywhere,
  onLogout
}: ProfileScreenProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("created-events");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const displayName = profile?.name || "Mi perfil";
  const facultyLabel = profile?.faculty ? `UADE | ${profile.faculty}` : "UADE";
  const joinedCommunities = useMemo(
    () => communities.filter((community) => community.joined && community.status !== "Pendiente"),
    [communities]
  );
  const createdEvents = profile?.createdEvents ?? [];
  const interestedEvents = useMemo(() => events.filter((event) => event.interested), [events]);
  const activeIndex = Math.max(0, getTabIndex(activeTab));
  const nextThemeLabel = themeMode === "dark" ? "Modo claro" : "Modo oscuro";

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setAvatarUploading(true);
    setAvatarError(null);

    try {
      await onUploadAvatar(file);
    } catch {
      setAvatarError("No pudimos actualizar la foto.");
    } finally {
      setAvatarUploading(false);
    }
  }

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
          <div className="absolute right-0 top-[45px] z-30 grid w-[212px] overflow-hidden rounded-[18px] bg-kreis-surface shadow-kreis-soft">
            <button
              className="flex h-[46px] items-center gap-3 border-0 bg-transparent px-4 text-left text-[14px] font-medium leading-[17px] text-kreis-ink shadow-none"
              type="button"
              onClick={() => {
                setSettingsOpen(false);
                setSecurityOpen(true);
              }}
            >
              <span className="grid size-7 place-items-center rounded-full bg-kreis-event-surface text-kreis-muted">
                <ShieldCheck className="size-[16px]" weight="regular" aria-hidden="true" />
              </span>
              Cuenta y seguridad
            </button>
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
          <input
            ref={avatarInputRef}
            className="hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void handleAvatarChange(event)}
          />
          <button
            className="absolute bottom-[3px] right-0 grid size-7 place-items-center rounded-full border-0 bg-kreis-orange p-0 text-kreis-cream shadow-none transition-transform duration-150 ease-out active:scale-95 disabled:opacity-70"
            type="button"
            aria-label={avatarUploading ? "Subiendo foto de perfil" : "Editar foto de perfil"}
            title="Cambiar foto de perfil"
            disabled={avatarUploading || profileLoadStatus !== "ready"}
            onClick={() => avatarInputRef.current?.click()}
          >
            <PencilSimple className="size-[14px]" weight="bold" aria-hidden="true" />
          </button>
        </div>

        {avatarError ? (
          <p className="m-0 mt-[8px] text-center text-[12px] font-normal leading-[15px] text-kreis-orange">{avatarError}</p>
        ) : null}

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
      {securityOpen ? (
        <AccountSecurityPanel
          email={profileEmail}
          onChangePassword={onChangePassword}
          onClose={() => setSecurityOpen(false)}
          onSignOutEverywhere={onSignOutEverywhere}
          onSignOutOtherDevices={onSignOutOtherDevices}
        />
      ) : null}
    </section>
  );
}

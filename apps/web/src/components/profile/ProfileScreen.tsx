import { CaretRight, SignOut, UserCircle } from "@phosphor-icons/react";
import { CalendarAdd, Ticket, UsersGroupRounded } from "@solar-icons/react";
import type { KreisUserProfile } from "../../api/users";
import type { ThemeMode } from "../../types";
import { ThemeToggleIcon } from "../common/Icons";

type ProfileScreenProps = {
  profile: KreisUserProfile | null;
  profileLoadStatus: "loading" | "ready" | "error";
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  onLogout: () => void;
};

const socialItems = [
  { label: "Mis eventos", tone: "bg-kreis-green", Icon: CalendarAdd },
  { label: "Eventos inscriptos", tone: "bg-kreis-pumpkin", Icon: Ticket },
  { label: "Mis comunidades", tone: "bg-kreis-orange", Icon: UsersGroupRounded }
];

export function ProfileScreen({
  profile,
  profileLoadStatus,
  themeMode,
  onToggleTheme,
  onLogout
}: ProfileScreenProps) {
  const displayName = profile?.name || (profileLoadStatus === "loading" ? "Cargando perfil..." : "Mi perfil");
  const facultyLabel = profile?.faculty ? `UADE | ${profile.faculty}` : "UADE";
  const nextThemeLabel = themeMode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  return (
    <section className="mx-auto w-full max-w-[393px] animate-[rise_220ms_ease-out] pb-6 pt-[max(53px,calc(env(safe-area-inset-top)+12px))] text-kreis-ink" data-screen="profile">
      <section className="grid grid-cols-[106px_minmax(0,1fr)] items-center gap-[26px]" aria-label="Datos de perfil">
        <div className="grid h-[116px] w-[106px] place-items-center rounded-[26px] bg-[rgba(10,10,10,0.1)] text-kreis-muted">
          <UserCircle className="size-[56px] opacity-35" weight="thin" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="m-0 truncate text-[24px] font-medium leading-[30px]">{displayName}</h2>
          <p className="m-0 mt-[1px] truncate text-[16px] font-medium leading-[19px] text-kreis-muted">{facultyLabel}</p>
          <button
            className="mt-[12px] h-[29px] rounded-[10px] border-0 bg-kreis-orange px-[17px] text-[14px] font-medium leading-[29px] text-kreis-cream shadow-none disabled:cursor-default"
            type="button"
            disabled
            title="La edición de perfil estará disponible próximamente"
          >
            Editar Perfil
          </button>
        </div>
      </section>

      {profileLoadStatus === "error" ? <p className="m-0 mt-2 text-[12px] leading-[15px] text-kreis-muted">No pudimos cargar todos tus datos.</p> : null}

      <section className="mt-[18px]" aria-labelledby="profile-social-title">
        <h2 id="profile-social-title" className="m-0 text-[22px] font-medium leading-[27px]">Social</h2>
        <div className="mt-[13px] rounded-[20px] bg-kreis-event-surface px-[15px] py-[15px]">
          {socialItems.map(({ label, tone, Icon }) => (
            <div className="flex h-[50px] items-center gap-[12px]" key={label}>
              <span className={`grid size-[39px] flex-none place-items-center rounded-full text-kreis-cream ${tone}`} aria-hidden="true">
                <Icon className="size-[20px]" weight="Outline" />
              </span>
              <span className="min-w-0 flex-1 text-[15px] font-medium leading-[19px]">{label}</span>
              <CaretRight className="size-[16px] flex-none text-kreis-muted" weight="bold" aria-hidden="true" />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-[18px]" aria-labelledby="profile-settings-title">
        <h2 id="profile-settings-title" className="m-0 text-[22px] font-medium leading-[27px]">Configuración</h2>
        <div className="mt-[13px] rounded-[20px] bg-kreis-event-surface px-[15px] py-[10px]">
          <button
            className="flex h-[52px] w-full items-center gap-[12px] border-0 bg-transparent p-0 text-left text-[15px] font-medium text-kreis-ink shadow-none"
            type="button"
            aria-label={nextThemeLabel}
            aria-pressed={themeMode === "dark"}
            onClick={onToggleTheme}
          >
            <span className="grid size-[39px] flex-none place-items-center rounded-full bg-kreis-event-surface text-kreis-muted [&_svg]:size-[19px]">
              <ThemeToggleIcon themeMode={themeMode} />
            </span>
            <span className="min-w-0 flex-1">{themeMode === "dark" ? "Modo claro" : "Modo oscuro"}</span>
            <CaretRight className="size-[16px] flex-none text-kreis-muted" weight="bold" aria-hidden="true" />
          </button>
          <button
            className="flex h-[52px] w-full items-center gap-[12px] border-0 bg-transparent p-0 text-left text-[15px] font-medium text-kreis-ink shadow-none"
            type="button"
            onClick={onLogout}
          >
            <span className="grid size-[39px] flex-none place-items-center rounded-full bg-kreis-event-surface text-kreis-muted">
              <SignOut className="size-[19px]" weight="regular" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">Cerrar sesión</span>
            <CaretRight className="size-[16px] flex-none text-kreis-muted" weight="bold" aria-hidden="true" />
          </button>
        </div>
      </section>
    </section>
  );
}

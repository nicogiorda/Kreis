import { CalendarBlank, House, Moon, SunDim, UserCircle, UserCirclePlus, UsersThree } from "@phosphor-icons/react";
import type { Screen, ThemeMode } from "../../types";

export function MenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 7h14M5 12h14M5 17h14" />
    </svg>
  );
}

export function NotificationIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M18.4 9.9c0-3.4-2.1-5.8-5.1-6.4a1.35 1.35 0 0 0-2.6 0c-3 .6-5.1 3-5.1 6.4v2.7c0 1.1-.5 2.1-1.3 2.8-.5.4-.2 1.2.5 1.2h14.4c.7 0 1-.8.5-1.2-.8-.7-1.3-1.7-1.3-2.8V9.9zM9.7 18.5c.3 1 1.2 1.7 2.3 1.7s2-.7 2.3-1.7" />
    </svg>
  );
}

export function ThemeToggleIcon({ themeMode }: { themeMode: ThemeMode }) {
  const Icon = themeMode === "dark" ? SunDim : Moon;

  return <Icon aria-hidden="true" weight="regular" />;
}

export function HeaderActionIcon() {
  return <UserCirclePlus aria-hidden="true" weight="regular" />;
}

type NavIconProps = {
  type: Screen;
  active?: boolean;
};

export function NavIcon({ type, active = false }: NavIconProps) {
  const icons = {
    home: House,
    events: CalendarBlank,
    communities: UsersThree,
    profile: UserCircle
  };
  const Icon = icons[type];

  return (
    <span className="grid size-7 place-items-center text-[1.1rem] leading-none" aria-hidden="true">
      <Icon className="size-[28px]" weight="fill" />
    </span>
  );
}

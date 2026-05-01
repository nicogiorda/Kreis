import type { Screen } from "../../types";

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

type NavIconProps = {
  type: Screen;
};

export function NavIcon({ type }: NavIconProps) {
  const paths: Record<Screen, string> = {
    home: "M12 3.7 3.8 10.4c-.5.4-.2 1.2.4 1.2h1V20c0 .6.4 1 1 1h4.1v-5.2c0-.5.4-.9.9-.9h1.6c.5 0 .9.4.9.9V21h4.1c.6 0 1-.4 1-1v-8.4h1c.6 0 .9-.8.4-1.2L12 3.7z",
    events: "M7 2.8c.6 0 1 .4 1 1v1h8v-1c0-.6.4-1 1-1s1 .4 1 1v1h.4c1.4 0 2.6 1.2 2.6 2.6v10.8c0 1.4-1.2 2.6-2.6 2.6H5.6c-1.4 0-2.6-1.2-2.6-2.6V7.4c0-1.4 1.2-2.6 2.6-2.6H6v-1c0-.6.4-1 1-1zm-2 7v8.4c0 .3.3.6.6.6h12.8c.3 0 .6-.3.6-.6V9.8H5zm4 2.6h3.4c.4 0 .7.3.7.7v3.2c0 .4-.3.7-.7.7H9c-.4 0-.7-.3-.7-.7v-3.2c0-.4.3-.7.7-.7z",
    communities: "M8.2 11.4a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4zm8.3.6a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.7 20.4c.4-3.1 2.7-5.4 5.5-5.4s5.1 2.3 5.5 5.4c.1.4-.2.8-.7.8H3.4c-.5 0-.8-.4-.7-.8zm12.2.8h5.9c.4 0 .7-.4.6-.8-.3-2.7-2.4-4.8-4.9-4.8-1.1 0-2.1.4-2.9 1.1.7.9 1.2 1.9 1.3 3.1.1.5.1.9 0 1.4z",
    profile: "M12 12.4a4.7 4.7 0 1 0 0-9.4 4.7 4.7 0 0 0 0 9.4zm-7.7 8.3c.5-4 3.7-6.7 7.7-6.7s7.2 2.7 7.7 6.7c.1.4-.3.8-.7.8H5c-.4 0-.8-.4-.7-.8z"
  };

  return (
    <span className="nav-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d={paths[type]} />
      </svg>
    </span>
  );
}

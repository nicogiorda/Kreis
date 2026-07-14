import type { ReactNode } from "react";
import type { Screen } from "../../types";
import { cn } from "../../utils/cn";
import { DesktopSidebar } from "../navigation/DesktopSidebar";

type DesktopAppShellProps = {
  screen: Screen;
  aside?: ReactNode;
  children: ReactNode;
  onNavigate: (screen: Screen) => void;
};

export function DesktopAppShell({ screen, aside, children, onNavigate }: DesktopAppShellProps) {
  return (
    <div className={cn("desktop-app-shell", aside ? "desktop-app-shell--with-aside" : undefined)}>
      <DesktopSidebar screen={screen} onNavigate={onNavigate} />
      <div className="desktop-app-main min-w-0">{children}</div>
      {aside ? <aside className="desktop-app-aside hidden xl:block">{aside}</aside> : null}
    </div>
  );
}

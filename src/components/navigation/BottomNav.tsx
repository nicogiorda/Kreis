import { NavIcon } from "../common/Icons";
import type { Screen } from "../../types";

const navItems: Array<{ id: Screen; label: string }> = [
  { id: "home", label: "Home" },
  { id: "events", label: "Eventos" },
  { id: "communities", label: "Comunidades" },
  { id: "profile", label: "Perfil" }
];

type BottomNavProps = {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
};

export function BottomNav({ screen, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Navegacion principal">
      {navItems.map((item) => (
        <button className={`nav-item ${screen === item.id ? "is-active" : ""}`} type="button" key={item.id} aria-label={item.label} onClick={() => onNavigate(item.id)}>
          <NavIcon type={item.id} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

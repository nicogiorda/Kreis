import { CalendarMinimalistic, Home2, UserCircle, UsersGroupRounded } from "@solar-icons/react";
import type { Screen } from "../../types";

type SolarNavIcon = typeof Home2;

export const navigationItems: Array<{
  id: Screen;
  label: string;
  Icon: SolarNavIcon;
}> = [
  { id: "home", label: "Inicio", Icon: Home2 },
  { id: "events", label: "Eventos", Icon: CalendarMinimalistic },
  { id: "communities", label: "Comunidades", Icon: UsersGroupRounded },
  { id: "profile", label: "Perfil", Icon: UserCircle }
];

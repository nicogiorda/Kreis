import {
  Bag,
  Basketball,
  BookBookmark,
  ChartSquare,
  ChefHat,
  ClapperboardPlay,
  CodeSquare,
  Gamepad,
  Hanger2,
  HeartPulse,
  PaletteRound,
  RunningRound,
  Shop,
  SquareAcademicCap,
  UsersGroupRounded,
  WalletMoney,
  Widget
} from "@solar-icons/react";
import type { IconWeight } from "@solar-icons/react";
import type { ComponentType } from "react";
import { normalize } from "../../utils/text";

type EventTopicIconProps = {
  category: string;
};

type SolarTopicIcon = ComponentType<{
  className?: string;
  weight?: IconWeight;
  "aria-hidden"?: "true";
}>;

type TopicIconConfig = {
  Icon: SolarTopicIcon;
  weight: IconWeight;
};

const topicIconMap: Record<string, TopicIconConfig> = {
  todos: { Icon: Widget, weight: "BoldDuotone" },
  academico: { Icon: SquareAcademicCap, weight: "BoldDuotone" },
  deporte: { Icon: Basketball, weight: "BoldDuotone" },
  deportes: { Icon: Basketball, weight: "BoldDuotone" },
  tecnologia: { Icon: CodeSquare, weight: "LineDuotone" },
  tech: { Icon: CodeSquare, weight: "LineDuotone" },
  arte: { Icon: PaletteRound, weight: "BoldDuotone" },
  artistico: { Icon: PaletteRound, weight: "BoldDuotone" },
  entretenimiento: { Icon: ClapperboardPlay, weight: "BoldDuotone" },
  cultura: { Icon: BookBookmark, weight: "LineDuotone" },
  cultural: { Icon: BookBookmark, weight: "LineDuotone" },
  social: { Icon: UsersGroupRounded, weight: "BoldDuotone" },
  negocios: { Icon: ChartSquare, weight: "LineDuotone" },
  emprendimientos: { Icon: ChartSquare, weight: "LineDuotone" },
  emprendimiento: { Icon: ChartSquare, weight: "LineDuotone" },
  gaming: { Icon: Gamepad, weight: "BoldDuotone" },
  juegos: { Icon: Gamepad, weight: "BoldDuotone" },
  diseno: { Icon: PaletteRound, weight: "LineDuotone" },
  design: { Icon: PaletteRound, weight: "LineDuotone" },
  ux: { Icon: PaletteRound, weight: "LineDuotone" },
  finanzas: { Icon: WalletMoney, weight: "BoldDuotone" },
  gastronomia: { Icon: ChefHat, weight: "BoldDuotone" },
  cocina: { Icon: ChefHat, weight: "BoldDuotone" },
  moda: { Icon: Hanger2, weight: "BoldDuotone" },
  nba: { Icon: Basketball, weight: "BoldDuotone" },
  bienestar: { Icon: HeartPulse, weight: "LineDuotone" },
  running: { Icon: RunningRound, weight: "LineDuotone" },
  sustentabilidad: { Icon: Shop, weight: "LineDuotone" }
};

export function EventTopicIcon({ category }: EventTopicIconProps) {
  const normalizedCategory = normalize(category);
  const config = topicIconMap[normalizedCategory] ?? { Icon: Bag, weight: "LineDuotone" as const };
  const { Icon, weight } = config;

  return (
    <Icon
      className="size-[23px]"
      weight={weight}
      aria-hidden="true"
    />
  );
}

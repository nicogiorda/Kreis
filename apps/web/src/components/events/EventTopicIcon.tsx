import type { ReactNode } from "react";
import { normalize } from "../../utils/text";

type EventTopicIconProps = {
  category: string;
};

function TopicIconFrame({ children }: { children: ReactNode }) {
  return (
    <svg
      className="size-[23px]"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function AllTopicsIcon() {
  return (
    <TopicIconFrame>
      <rect x="7" y="7" width="7" height="7" rx="2" fill="var(--fiery-glow)" opacity="0.9" />
      <rect x="18" y="7" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="7" y="18" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="18" y="18" width="7" height="7" rx="2" fill="currentColor" opacity="0.75" />
    </TopicIconFrame>
  );
}

function AcademicTopicIcon() {
  return (
    <TopicIconFrame>
      <path d="M5.5 13.4 16 8.2l10.5 5.2L16 18.7 5.5 13.4Z" fill="var(--fiery-glow)" opacity="0.16" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M10.5 16.6v4.1c2.9 2 8.1 2 11 0v-4.1" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26.4 14.2v7" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <circle cx="26.4" cy="23" r="1.7" fill="var(--fiery-glow)" />
    </TopicIconFrame>
  );
}

function SportTopicIcon() {
  return (
    <TopicIconFrame>
      <circle cx="16" cy="16" r="10.5" fill="var(--fiery-glow)" opacity="0.13" stroke="currentColor" strokeWidth="2.1" />
      <path d="M7.6 13.4c4.7 1.8 8.5 5.8 9.6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18.9 6.8c-1.8 4.8 0.7 10.1 6.7 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8.8 22.2c3.4-1.9 7.7-1.9 12.5 0.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </TopicIconFrame>
  );
}

function TechTopicIcon() {
  return (
    <TopicIconFrame>
      <rect x="9" y="9" width="14" height="14" rx="3.2" fill="var(--fiery-glow)" opacity="0.14" stroke="currentColor" strokeWidth="2.1" />
      <rect x="13.2" y="13.2" width="5.6" height="5.6" rx="1.4" fill="currentColor" opacity="0.82" />
      <path d="M12 5.8v3.2M16 5.8v3.2M20 5.8v3.2M12 23v3.2M16 23v3.2M20 23v3.2M5.8 12h3.2M5.8 16h3.2M5.8 20h3.2M23 12h3.2M23 16h3.2M23 20h3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </TopicIconFrame>
  );
}

function ArtTopicIcon() {
  return (
    <TopicIconFrame>
      <path d="M9 21.3c4.7 4.4 14.2 1.2 14.2-6.1 0-4.8-3.8-8.2-8.3-8.2-4.6 0-8.2 3.6-8.2 8.1 0 1.4 0.5 2.3 1.2 2.8 0.7 0.5 1.6 0.4 2.4 0.2 1.2-0.2 1.9 0.8 1.2 1.8-0.6 0.9-1.1 1.9-0.5 2.6" fill="var(--fiery-glow)" opacity="0.14" />
      <path d="M9 21.3c4.7 4.4 14.2 1.2 14.2-6.1 0-4.8-3.8-8.2-8.3-8.2-4.6 0-8.2 3.6-8.2 8.1 0 1.4 0.5 2.3 1.2 2.8 0.7 0.5 1.6 0.4 2.4 0.2 1.2-0.2 1.9 0.8 1.2 1.8-0.6 0.9-1.1 1.9-0.5 2.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="1.4" fill="currentColor" />
      <circle cx="16" cy="10.9" r="1.4" fill="var(--fiery-glow)" />
      <circle cx="19.6" cy="13.4" r="1.4" fill="currentColor" opacity="0.7" />
    </TopicIconFrame>
  );
}

function EntertainmentTopicIcon() {
  return (
    <TopicIconFrame>
      <path d="M7 11.2h18v3.2a2.7 2.7 0 0 0 0 5.2v3.2H7v-3.2a2.7 2.7 0 0 0 0-5.2v-3.2Z" fill="var(--fiery-glow)" opacity="0.15" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
      <path d="m16 13.1 1.3 2.5 2.8 0.4-2 1.9 0.5 2.8-2.6-1.4-2.6 1.4 0.5-2.8-2-1.9 2.8-0.4 1.3-2.5Z" fill="currentColor" />
    </TopicIconFrame>
  );
}

function CultureTopicIcon() {
  return (
    <TopicIconFrame>
      <path d="M8.2 8.2h15.6v14c-4.4-1.7-7.2-1.6-11.8 0-1.3 0.5-2.7 1.1-3.8 1.8V8.2Z" fill="var(--fiery-glow)" opacity="0.13" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M12.3 8.6v13M19.7 8.6v13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <path d="M11.7 14.2c1.2 1 2.6 1 4.3 0 1.7 1 3.1 1 4.3 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </TopicIconFrame>
  );
}

function SocialTopicIcon() {
  return (
    <TopicIconFrame>
      <path d="M7.5 10.4c0-2 1.6-3.5 3.5-3.5h10c2 0 3.5 1.6 3.5 3.5v6.1c0 2-1.6 3.5-3.5 3.5h-5.4l-5.1 4v-4h-0.5c-2 0-3.5-1.6-3.5-3.5v-6.1Z" fill="var(--fiery-glow)" opacity="0.14" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M12.2 13.2h7.6M12.2 16.2h4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </TopicIconFrame>
  );
}

function BusinessTopicIcon() {
  return (
    <TopicIconFrame>
      <path d="M7 24h18" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <rect x="8.7" y="16" width="4.2" height="8" rx="1.2" fill="currentColor" opacity="0.68" />
      <rect x="14.2" y="12.1" width="4.2" height="11.9" rx="1.2" fill="var(--fiery-glow)" />
      <rect x="19.7" y="8" width="4.2" height="16" rx="1.2" fill="currentColor" opacity="0.82" />
      <path d="m7.8 13.4 4.8-4.2 4.1 2.8 6.1-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </TopicIconFrame>
  );
}

function GamingTopicIcon() {
  return (
    <TopicIconFrame>
      <path d="M10 13.2c1.2-1.2 3.2-1.8 6-1.8s4.8 0.6 6 1.8l2.8 6.5c0.7 1.6-0.5 3.3-2.2 3.3-0.7 0-1.3-0.3-1.8-0.8l-2.3-2.4h-5l-2.3 2.4c-0.5 0.5-1.1 0.8-1.8 0.8-1.7 0-2.9-1.7-2.2-3.3l2.8-6.5Z" fill="var(--fiery-glow)" opacity="0.14" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M11.8 16.7h4M13.8 14.7v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20.4" cy="16.2" r="1.4" fill="currentColor" />
      <circle cx="23" cy="18.9" r="1.4" fill="var(--fiery-glow)" />
    </TopicIconFrame>
  );
}

function DesignTopicIcon() {
  return (
    <TopicIconFrame>
      <path d="M8.1 23.9 13 22.5 23.3 12.2c1.2-1.2 1.2-3.1 0-4.3-1.2-1.2-3.1-1.2-4.3 0L8.7 18.2 8.1 23.9Z" fill="var(--fiery-glow)" opacity="0.15" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
      <path d="m18.2 9.1 4.7 4.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10.8" cy="21.4" r="1.3" fill="currentColor" />
    </TopicIconFrame>
  );
}

function getFallbackInitials(category: string): string {
  const words = normalize(category)
    .split(/\s+/)
    .filter(Boolean);

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase() || "?";
}

function FallbackTopicIcon({ category }: EventTopicIconProps) {
  return (
    <TopicIconFrame>
      <circle cx="16" cy="16" r="10.5" fill="var(--fiery-glow)" opacity="0.15" stroke="currentColor" strokeWidth="2.1" />
      <text x="16" y="19.5" textAnchor="middle" className="fill-current text-[10px] font-black">
        {getFallbackInitials(category)}
      </text>
    </TopicIconFrame>
  );
}

export function EventTopicIcon({ category }: EventTopicIconProps) {
  const normalizedCategory = normalize(category);

  if (normalizedCategory === "todos") return <AllTopicsIcon />;
  if (normalizedCategory === "academico") return <AcademicTopicIcon />;
  if (normalizedCategory === "deporte" || normalizedCategory === "deportes") return <SportTopicIcon />;
  if (normalizedCategory === "tecnologia" || normalizedCategory === "tech") return <TechTopicIcon />;
  if (normalizedCategory === "arte" || normalizedCategory === "artistico") return <ArtTopicIcon />;
  if (normalizedCategory === "entretenimiento") return <EntertainmentTopicIcon />;
  if (normalizedCategory === "cultura" || normalizedCategory === "cultural") return <CultureTopicIcon />;
  if (normalizedCategory === "social") return <SocialTopicIcon />;
  if (normalizedCategory === "negocios" || normalizedCategory === "emprendimientos") return <BusinessTopicIcon />;
  if (normalizedCategory === "gaming" || normalizedCategory === "juegos") return <GamingTopicIcon />;
  if (normalizedCategory === "diseno" || normalizedCategory === "design" || normalizedCategory === "ux") return <DesignTopicIcon />;

  return <FallbackTopicIcon category={category} />;
}

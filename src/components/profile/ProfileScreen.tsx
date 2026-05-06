import { profile } from "../../data/profile";
import type { ActivityPost, Community, KreisEvent } from "../../types";

type ProfileScreenProps = {
  communities: Community[];
  events: KreisEvent[];
  activity?: ActivityPost[];
};

export function ProfileScreen({ communities, events }: ProfileScreenProps) {
  const joined = communities.filter((community) => community.joined);
  const signedEvents = events.filter((event) => event.interested);

  return (
    <section className="pt-[18px] animate-[rise_220ms_ease-out]" data-screen="profile">
      <article className="overflow-hidden rounded-kreis-card border border-kreis-line bg-kreis-orange text-[#fff5e5] shadow-kreis-soft">
        <div className="grid grid-cols-[auto_1fr] items-center gap-4 p-5">
          <img className="size-[78px] rounded-[18px] border-4 border-[rgba(247,237,218,0.88)] object-cover" src={profile.photo} alt={`Foto de ${profile.name}`} />
          <div>
            <h1 className="m-0 text-[1.55rem]">{profile.name}</h1>
            <p className="mb-0 mt-[5px] text-[rgba(247,237,218,0.78)]">{profile.career}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-[rgba(247,237,218,0.15)]">
          <div className="px-2 py-3.5 text-center">
            <strong className="block text-[1.1rem]">{joined.length}</strong>
            <span className="mt-0.5 block text-[0.78rem] font-bold text-[rgba(247,237,218,0.72)]">comunidades</span>
          </div>
          <div className="px-2 py-3.5 text-center">
            <strong className="block text-[1.1rem]">{signedEvents.length}</strong>
            <span className="mt-0.5 block text-[0.78rem] font-bold text-[rgba(247,237,218,0.72)]">eventos</span>
          </div>
          <div className="px-2 py-3.5 text-center">
            <strong className="block text-[1.1rem]">UADE</strong>
            <span className="mt-0.5 block text-[0.78rem] font-bold text-[rgba(247,237,218,0.72)]">campus</span>
          </div>
        </div>
      </article>

      <section className="my-[22px]">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="m-0 text-[1.23rem] leading-[1.02] tracking-normal">Mis comunidades</h2>
            <p className="mt-[5px] text-kreis-muted leading-[1.45]">Espacios donde ya participas.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {joined.map((community) => (
            <article className="rounded-kreis-card border border-kreis-line bg-kreis-surface p-[15px] shadow-kreis-soft" key={community.id}>
              <strong className="mb-[5px] block">{community.name}</strong>
              <span className="mt-[5px] text-kreis-muted leading-[1.45]">{community.category} - {community.members} miembros</span>
            </article>
          ))}
        </div>
      </section>

      <section className="my-[22px]">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="m-0 text-[1.23rem] leading-[1.02] tracking-normal">Eventos anotados</h2>
            <p className="mt-[5px] text-kreis-muted leading-[1.45]">Tu proxima excusa para cruzarte con gente nueva.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {signedEvents.map((event) => (
            <article className="rounded-kreis-card border border-kreis-line bg-kreis-surface p-[15px] shadow-kreis-soft" key={event.id}>
              <strong className="mb-[5px] block">{event.title}</strong>
              <span className="mt-[5px] text-kreis-muted leading-[1.45]">{event.date} - {event.place}</span>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

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
    <section className="screen is-active" data-screen="profile">
      <article className="profile-hero card">
        <div className="profile-top">
          <img className="profile-photo" src={profile.photo} alt={`Foto de ${profile.name}`} />
          <div>
            <h1>{profile.name}</h1>
            <p>{profile.career}</p>
          </div>
        </div>
        <div className="profile-stats">
          <div>
            <strong>{joined.length}</strong>
            <span>comunidades</span>
          </div>
          <div>
            <strong>{signedEvents.length}</strong>
            <span>eventos</span>
          </div>
          <div>
            <strong>UADE</strong>
            <span>campus</span>
          </div>
        </div>
      </article>

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Mis comunidades</h2>
            <p>Espacios donde ya participas.</p>
          </div>
        </div>
        <div className="profile-grid">
          {joined.map((community) => (
            <article className="mini-card card" key={community.id}>
              <strong>{community.name}</strong>
              <span className="muted">{community.category} - {community.members} miembros</span>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Eventos anotados</h2>
            <p>Tu proxima excusa para cruzarte con gente nueva.</p>
          </div>
        </div>
        <div className="profile-grid">
          {signedEvents.map((event) => (
            <article className="mini-card card" key={event.id}>
              <strong>{event.title}</strong>
              <span className="muted">{event.date} - {event.place}</span>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

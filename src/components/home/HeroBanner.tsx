import kreisitoUrl from "../../assets/characters/kreisito.png";
import videoBannerUrl from "../../assets/brand/VideoBanner2.mp4";

export function HeroBanner() {
  return (
    <section className="campus-panel" aria-label="Kreis">
      <video
        className="campus-video-background"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src={videoBannerUrl} type="video/mp4" />
      </video>
      <img className="campus-character" src={kreisitoUrl} alt="" aria-hidden="true" />
      <div className="campus-copy">
        <h1>Elegis donde entrar.</h1>
        <p>Eventos para anotarte y comunidades nuevas para descubrir.</p>
      </div>
    </section>
  );
}

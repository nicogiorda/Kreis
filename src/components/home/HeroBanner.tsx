import kreisitoUrl from "../../assets/characters/kreisito_saludando.webp";

export function HeroBanner() {
  return (
    <section className="campus-panel relative isolate -mx-[var(--page-gutter)] min-h-[clamp(13.7rem,52vw,18.2rem)] w-[calc(100%+(var(--page-gutter)*2))] overflow-hidden bg-kreis-green px-[var(--page-gutter)] pb-[clamp(3rem,8vw,4.5rem)] pt-[clamp(3.15rem,12vw,4.25rem)] text-kreis-cream shadow-none" aria-label="Kreis">
      <div className="relative z-[2] grid max-w-[clamp(11rem,55vw,22rem)] gap-[0.48rem]">
        <h1 className="hero-banner-title m-0 max-w-[8.1em] text-[clamp(1.5rem,6.5vw,2.72rem)] leading-none tracking-normal text-kreis-cream">Elegís donde entrar</h1>
        <p className="m-0 max-w-[13rem] text-[clamp(0.9rem,3.5vw,1.04rem)] font-medium leading-[1.22] text-[rgba(247,237,218,0.86)]">Planes, grupos y momentos para cruzarte con gente nueva.</p>
      </div>
      <img className="pointer-events-none absolute right-[var(--page-gutter)] top-[clamp(1.9rem,9.2vw,2.55rem)] z-[1] h-auto w-[clamp(8.65rem,37.2vw,10rem)] max-w-none" src={kreisitoUrl} alt="" aria-hidden="true" />
    </section>
  );
}

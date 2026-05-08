import logoUrl from "../../assets/brand/svgs/IMAGOTIPO-INVERTIDO.svg";
import kreisitoUrl from "../../assets/characters/kreisito_saludando.webp";

export function HeroBanner() {
  return (
    <section className="campus-panel relative isolate -mx-[var(--page-gutter)] grid min-h-[clamp(14.2rem,53vw,18.8rem)] w-[calc(100%+(var(--page-gutter)*2))] grid-cols-[minmax(0,1fr)_clamp(118px,38vw,226px)] items-center overflow-hidden bg-kreis-green px-[var(--page-gutter)] pb-[clamp(3.05rem,9vw,4.7rem)] pt-[clamp(1.2rem,4.8vw,2.35rem)] text-kreis-cream shadow-none" aria-label="Kreis">
      <div className="relative z-[2] grid max-w-[clamp(11rem,55vw,22rem)] translate-y-[clamp(-0.75rem,-2.5vw,-0.32rem)] gap-[0.48rem]">
        <img className="mb-[0.18rem] h-auto w-[clamp(4.8rem,22vw,7.4rem)]" src={logoUrl} alt="Kreis" />
        <h1 className="hero-banner-title m-0 max-w-[8.1em] text-[clamp(1.5rem,6.5vw,2.72rem)] leading-none tracking-normal text-kreis-cream">{"Elegis donde entrar"}</h1>
        <p className="m-0 max-w-[13rem] text-[clamp(0.9rem,3.5vw,1.04rem)] font-medium leading-[1.22] text-[rgba(247,237,218,0.86)]">Planes, grupos y momentos para cruzarte con gente nueva.</p>
      </div>
      <div className="pointer-events-none relative z-[2] min-w-0 self-stretch" aria-hidden="true">
        <img className="pointer-events-none absolute right-[clamp(0.55rem,3.2vw,1.6rem)] top-1/2 z-[1] h-auto w-[clamp(9.2rem,35vw,13.6rem)] max-w-none -translate-y-1/2" src={kreisitoUrl} alt="" />
      </div>
    </section>
  );
}

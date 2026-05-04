import logoUrl from "../../assets/brand/svgs/IMAGOTIPO-INVERTIDO.svg";
import kreisitoUrl from "../../assets/characters/kreisito2.png";

export function HeroBanner() {
  return (
    <section className="campus-panel" aria-label="Kreis">
      <div className="campus-copy">
        <img className="campus-logo" src={logoUrl} alt="Kreis" />
        <h1>¡Elegis donde entrar!</h1>
        <p>Planes, grupos y momentos para cruzarte con gente nueva.</p>
      </div>
      <div className="campus-art" aria-hidden="true">
        <img className="campus-character" src={kreisitoUrl} alt="" />
      </div>
    </section>
  );
}

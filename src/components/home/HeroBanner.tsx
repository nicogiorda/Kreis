import { lazy, Suspense } from "react";
import kreisitoUrl from "../../assets/characters/kreisito.png";

const PixelBlast = lazy(() => import("../react-bits/PixelBlast/PixelBlast"));

export function HeroBanner() {
  return (
    <section className="campus-panel" aria-label="Kreis">
      <div className="campus-pixel-field">
        <Suspense fallback={null}>
          <PixelBlast
            variant="square"
            pixelSize={4}
            color="#f0531c"
            patternScale={2.5}
            patternDensity={1.2}
            enableRipples={false}
            rippleSpeed={0.25}
            rippleThickness={0.1}
            rippleIntensityScale={1}
            speed={0.7}
            transparent
            edgeFade={0}
          />
        </Suspense>
      </div>
      <img className="campus-character" src={kreisitoUrl} alt="" aria-hidden="true" />
      <div className="campus-copy">
        <h1>Elegis donde entrar.</h1>
        <p>Eventos para anotarte y comunidades nuevas para descubrir.</p>
      </div>
    </section>
  );
}

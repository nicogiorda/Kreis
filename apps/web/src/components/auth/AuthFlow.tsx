import { useEffect, useState } from "react";
import wordmarkUrl from "../../assets/auth/welcome-wordmark.svg";
import validatedCheckUrl from "../../assets/auth/validated-check.svg";
import signUpOneUrl from "../../assets/auth/signup-1.webp";
import signUpTwoUrl from "../../assets/auth/signup-2.webp";
import signUpThreeUrl from "../../assets/auth/signup-3.webp";
import signUpFourUrl from "../../assets/auth/signup-4.webp";
import invertedLogoUrl from "../../assets/brand/svgs/IMAGOTIPO-INVERTIDO.svg";
import greetingCharacterUrl from "../../assets/characters/kreisito_saludando.webp";
import { cn } from "../../utils/cn";

type AuthFlowProps = {
  onComplete: () => void;
};

type AuthStep = "welcome" | "login" | "university" | "interests" | "profile" | "password" | "certificate" | "validated";

const signUpSteps: AuthStep[] = ["university", "interests", "profile", "password", "certificate"];
const interestOptions = ["Deporte", "Tecnología", "Diseño", "Cultura", "Gaming", "Negocios", "Social", "Música", "Voluntariado"];

function AuthScreen({ children, tone }: { children: React.ReactNode; tone: "lace" | "green" | "orange" | "pumpkin" }) {
  return (
    <section className={cn("auth-screen", `auth-screen--${tone}`)}>
      {children}
    </section>
  );
}

function Progress({ step }: { step: AuthStep }) {
  const currentIndex = signUpSteps.indexOf(step);

  return (
    <div className="auth-progress" aria-label={`Paso ${currentIndex + 1} de ${signUpSteps.length}`}>
      {signUpSteps.map((item, index) => (
        <span className={cn("auth-progress-segment", index <= currentIndex && "is-active")} key={item} />
      ))}
    </div>
  );
}

function BrandLogo({ login = false }: { login?: boolean }) {
  return <img className={cn("auth-brand-logo", login && "auth-brand-logo--login")} src={invertedLogoUrl} alt="Kreis" />;
}

function CharacterBackground({ src, top = 0 }: { src: string; top?: number }) {
  return <img className="auth-character-bg" style={{ top }} src={src} alt="" aria-hidden="true" />;
}

function ContinueButton({ children = "Continuar", className, disabled = false, onClick }: { children?: React.ReactNode; className?: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button className={cn("auth-continue-button", className)} type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

function WelcomeScreen({ onBegin, onLogin }: { onBegin: () => void; onLogin: () => void }) {
  return (
    <AuthScreen tone="lace">
      <div className="auth-welcome-character">
        <span className="auth-welcome-shadow" aria-hidden="true" />
        <img src={greetingCharacterUrl} alt="" aria-hidden="true" />
      </div>
      <img className="auth-welcome-wordmark" src={wordmarkUrl} alt="Kreis" />
      <p className="auth-welcome-tagline">Conectar es parte.</p>
      <div className="auth-welcome-actions">
        <button className="auth-welcome-button auth-welcome-button--primary" type="button" onClick={onBegin}>Comenzar</button>
        <button className="auth-welcome-button auth-welcome-button--secondary" type="button" onClick={onLogin}>Ya tengo una cuenta</button>
      </div>
    </AuthScreen>
  );
}

function LoginScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <AuthScreen tone="green">
      <CharacterBackground src={signUpThreeUrl} top={279} />
      <BrandLogo login />
      <h1 className="auth-title auth-title--login">INICIA SESIÓN</h1>
      <div className="auth-field-stack auth-field-stack--login">
        <input className="auth-field" type="email" aria-label="Mail universitario" />
        <input className="auth-field" type="password" aria-label="Contraseña" />
      </div>
      <ContinueButton className="auth-continue-button--login" onClick={onContinue} />
    </AuthScreen>
  );
}

function UniversityScreen({ onContinue }: { onContinue: () => void }) {
  const [university, setUniversity] = useState("");

  return (
    <AuthScreen tone="green">
      <CharacterBackground src={signUpOneUrl} />
      <Progress step="university" />
      <BrandLogo />
      <h1 className="auth-title auth-title--university">ELIGE TU<br />UNIVERSIDAD</h1>
      <select className="auth-field auth-select" value={university} onChange={(event) => setUniversity(event.target.value)} aria-label="Selecciona una universidad">
        <option value="">Selecciona una universidad</option>
        <option value="uade">UADE</option>
        <option value="uba">UBA</option>
        <option value="utn">UTN</option>
      </select>
      <ContinueButton className="auth-continue-button--bottom" onClick={onContinue} />
    </AuthScreen>
  );
}

function InterestsScreen({ onContinue }: { onContinue: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggleInterest(interest: string): void {
    setSelected((items) => items.includes(interest) ? items.filter((item) => item !== interest) : [...items, interest]);
  }

  return (
    <AuthScreen tone="pumpkin">
      <CharacterBackground src={signUpTwoUrl} />
      <Progress step="interests" />
      <BrandLogo />
      <h1 className="auth-title auth-title--interests">¿CUÁLES SON<br />TUS INTERESES?</h1>
      <div className="auth-interest-grid" aria-label="Seleccionar intereses">
        {interestOptions.map((interest) => (
          <button
            className={cn("auth-interest-pill", selected.includes(interest) && "is-selected")}
            type="button"
            aria-label={interest}
            aria-pressed={selected.includes(interest)}
            key={interest}
            onClick={() => toggleInterest(interest)}
          />
        ))}
      </div>
      <p className="auth-interest-note">Seleccione mínimo 3 categorías.</p>
      <ContinueButton className="auth-continue-button--bottom" disabled={selected.length < 3} onClick={onContinue} />
    </AuthScreen>
  );
}

function ProfileScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <AuthScreen tone="green">
      <CharacterBackground src={signUpThreeUrl} top={306} />
      <Progress step="profile" />
      <BrandLogo />
      <h1 className="auth-title auth-title--profile">CREA TU<br />USUARIO</h1>
      <div className="auth-field-stack auth-field-stack--profile">
        <input className="auth-field" type="text" placeholder="Nombre y apellido" aria-label="Nombre y apellido" />
        <input className="auth-field" type="email" placeholder="Mail universitario" aria-label="Mail universitario" />
        <input className="auth-field" type="text" placeholder="Facultad" aria-label="Facultad" />
      </div>
      <ContinueButton className="auth-continue-button--profile" onClick={onContinue} />
    </AuthScreen>
  );
}

function PasswordScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <AuthScreen tone="pumpkin">
      <CharacterBackground src={signUpFourUrl} top={306} />
      <Progress step="password" />
      <BrandLogo />
      <h1 className="auth-title auth-title--password">CREA UNA<br />CONTRASEÑA</h1>
      <div className="auth-field-stack auth-field-stack--password">
        <input className="auth-field" type="password" placeholder="Contraseña" aria-label="Contraseña" />
        <input className="auth-field" type="password" placeholder="Repite la contraseña" aria-label="Repite la contraseña" />
      </div>
      <ContinueButton className="auth-continue-button--password" onClick={onContinue} />
    </AuthScreen>
  );
}

function CertificateScreen({ onValidate }: { onValidate: () => void }) {
  return (
    <AuthScreen tone="orange">
      <Progress step="certificate" />
      <BrandLogo />
      <h1 className="auth-title auth-title--certificate">ADJUNTA TU<br />CERTIFICADO<br />DE ALUMNO<br />REGULAR</h1>
      <button className="auth-certificate-button" type="button" onClick={onValidate}>Adjuntar</button>
    </AuthScreen>
  );
}

function ValidatedScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(onComplete, 1050);
    return () => window.clearTimeout(timeout);
  }, [onComplete]);

  return (
    <AuthScreen tone="orange">
      <img className="auth-validated-check" src={validatedCheckUrl} alt="Certificado validado" />
    </AuthScreen>
  );
}

export function AuthFlow({ onComplete }: AuthFlowProps) {
  const [step, setStep] = useState<AuthStep>("welcome");

  return (
    <div className="auth-flow-shell">
      {step === "welcome" && <WelcomeScreen onBegin={() => setStep("university")} onLogin={() => setStep("login")} />}
      {step === "login" && <LoginScreen onContinue={onComplete} />}
      {step === "university" && <UniversityScreen onContinue={() => setStep("interests")} />}
      {step === "interests" && <InterestsScreen onContinue={() => setStep("profile")} />}
      {step === "profile" && <ProfileScreen onContinue={() => setStep("password")} />}
      {step === "password" && <PasswordScreen onContinue={() => setStep("certificate")} />}
      {step === "certificate" && <CertificateScreen onValidate={() => setStep("validated")} />}
      {step === "validated" && <ValidatedScreen onComplete={onComplete} />}
    </div>
  );
}

import { useEffect, useState } from "react";
import { ApiRequestError, listFaculties, listTopics, login, register } from "../../api/auth";
import type { AuthResult, FacultyCatalogItem, TopicCatalogItem } from "../../api/auth";
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
  onComplete: (auth: AuthResult) => void;
};

type AuthStep = "welcome" | "login" | "university" | "interests" | "profile" | "password" | "certificate" | "validated";
type CatalogStatus = "loading" | "ready" | "error";

type SignupDraft = {
  university: string;
  legajo: string;
  topicIds: string[];
  fullName: string;
  email: string;
  facultyId: string;
  password: string;
  passwordConfirmation: string;
};

const signUpSteps: AuthStep[] = ["university", "interests", "profile", "password", "certificate"];
const emptySignupDraft: SignupDraft = {
  university: "",
  legajo: "",
  topicIds: [],
  fullName: "",
  email: "",
  facultyId: "",
  password: "",
  passwordConfirmation: ""
};

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

function BrandLogo({ login: isLogin = false }: { login?: boolean }) {
  return <img className={cn("auth-brand-logo", isLogin && "auth-brand-logo--login")} src={invertedLogoUrl} alt="Kreis" />;
}

function CharacterBackground({ src, top = 0 }: { src: string; top?: number }) {
  return <img className="auth-character-bg" style={{ top: `${(top / 852) * 100}%` }} src={src} alt="" aria-hidden="true" />;
}

function ContinueButton({ children = "Continuar", className, disabled = false, onClick }: { children?: React.ReactNode; className?: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button className={cn("auth-continue-button", className)} type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

function getAuthErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.code === "invalid_credentials") return "El mail o la contraseña no coinciden.";
    if (error.code === "register_failed") return "No pudimos crear la cuenta. Revisá si el mail o el legajo ya están registrados.";
    if (error.code === "validation_error") return "Revisá los datos ingresados antes de continuar.";
  }

  return "No pudimos conectar con el servidor. Intentá nuevamente.";
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

function LoginScreen({ onComplete }: { onComplete: (auth: AuthResult) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(): Promise<void> {
    setSubmitting(true);
    setError(null);

    try {
      onComplete(await login(email.trim(), password));
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen tone="green">
      <CharacterBackground src={signUpThreeUrl} top={279} />
      <BrandLogo login />
      <h1 className="auth-title auth-title--login">INICIA SESIÓN</h1>
      <div className="auth-field-stack auth-field-stack--login">
        <input className="auth-field" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Mail universitario" aria-label="Mail universitario" />
        <input className="auth-field" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Contraseña" aria-label="Contraseña" />
      </div>
      {error && <p className="auth-form-error auth-form-error--login">{error}</p>}
      <ContinueButton className="auth-continue-button--login" disabled={submitting || !email.trim() || password.length < 8} onClick={() => void handleLogin()}>
        {submitting ? "Ingresando..." : "Continuar"}
      </ContinueButton>
    </AuthScreen>
  );
}

function UniversityScreen({ draft, onChange, onContinue }: { draft: SignupDraft; onChange: (updates: Partial<SignupDraft>) => void; onContinue: () => void }) {
  return (
    <AuthScreen tone="green">
      <CharacterBackground src={signUpOneUrl} />
      <Progress step="university" />
      <BrandLogo />
      <h1 className="auth-title auth-title--university">ELIGE TU<br />UNIVERSIDAD</h1>
      <div className="auth-university-fields">
        <select className="auth-field auth-select" value={draft.university} onChange={(event) => onChange({ university: event.target.value })} aria-label="Selecciona una universidad">
          <option value="">Selecciona una universidad</option>
          <option value="uade">UADE</option>
          <option value="uba">UBA</option>
          <option value="utn">UTN</option>
        </select>
        <input className="auth-field" type="text" inputMode="numeric" autoComplete="off" value={draft.legajo} onChange={(event) => onChange({ legajo: event.target.value.replace(/\D/g, "") })} placeholder="Legajo" aria-label="Legajo" />
      </div>
      <ContinueButton className="auth-continue-button--bottom" disabled={!draft.university || !draft.legajo} onClick={onContinue} />
    </AuthScreen>
  );
}

function InterestsScreen({ draft, topics, status, onChange, onContinue }: { draft: SignupDraft; topics: TopicCatalogItem[]; status: CatalogStatus; onChange: (updates: Partial<SignupDraft>) => void; onContinue: () => void }) {
  function toggleInterest(topicId: string): void {
    onChange({
      topicIds: draft.topicIds.includes(topicId)
        ? draft.topicIds.filter((item) => item !== topicId)
        : [...draft.topicIds, topicId]
    });
  }

  const note = status === "loading"
    ? "Cargando intereses..."
    : status === "error"
      ? "No pudimos cargar los intereses."
      : "Seleccione mínimo 3 categorías.";

  return (
    <AuthScreen tone="pumpkin">
      <CharacterBackground src={signUpTwoUrl} />
      <Progress step="interests" />
      <BrandLogo />
      <h1 className="auth-title auth-title--interests">¿CUÁLES SON<br />TUS INTERESES?</h1>
      <div className="auth-interest-grid" aria-label="Seleccionar intereses">
        {topics.map((topic) => (
          <button
            className={cn("auth-interest-pill", draft.topicIds.includes(topic.id_topico) && "is-selected")}
            type="button"
            aria-label={topic.topico}
            aria-pressed={draft.topicIds.includes(topic.id_topico)}
            title={topic.topico}
            key={topic.id_topico}
            onClick={() => toggleInterest(topic.id_topico)}
          >
            {topic.topico}
          </button>
        ))}
      </div>
      <p className="auth-interest-note">{note}</p>
      <ContinueButton className="auth-continue-button--bottom" disabled={status !== "ready" || draft.topicIds.length < 3} onClick={onContinue} />
    </AuthScreen>
  );
}

function ProfileScreen({ draft, faculties, status, onChange, onContinue }: { draft: SignupDraft; faculties: FacultyCatalogItem[]; status: CatalogStatus; onChange: (updates: Partial<SignupDraft>) => void; onContinue: () => void }) {
  const hasFullName = draft.fullName.trim().split(/\s+/).length >= 2;
  const hasEmail = /^\S+@\S+\.\S+$/.test(draft.email.trim());

  return (
    <AuthScreen tone="green">
      <CharacterBackground src={signUpThreeUrl} top={306} />
      <Progress step="profile" />
      <BrandLogo />
      <h1 className="auth-title auth-title--profile">CREA TU<br />USUARIO</h1>
      <div className="auth-field-stack auth-field-stack--profile">
        <input className="auth-field" type="text" autoComplete="name" value={draft.fullName} onChange={(event) => onChange({ fullName: event.target.value })} placeholder="Nombre y apellido" aria-label="Nombre y apellido" />
        <input className="auth-field" type="email" autoComplete="email" value={draft.email} onChange={(event) => onChange({ email: event.target.value })} placeholder="Mail universitario" aria-label="Mail universitario" />
        <select className="auth-field auth-select" value={draft.facultyId} onChange={(event) => onChange({ facultyId: event.target.value })} disabled={status !== "ready"} aria-label="Facultad">
          <option value="">{status === "loading" ? "Cargando facultades..." : "Selecciona una facultad"}</option>
          {faculties.map((faculty) => <option value={faculty.id_facultad} key={faculty.id_facultad}>{faculty.nombre}</option>)}
        </select>
      </div>
      {status === "error" && <p className="auth-form-error auth-form-error--profile">No pudimos cargar las facultades.</p>}
      <ContinueButton className="auth-continue-button--profile" disabled={!hasFullName || !hasEmail || !draft.facultyId} onClick={onContinue} />
    </AuthScreen>
  );
}

function PasswordScreen({ draft, onChange, onContinue }: { draft: SignupDraft; onChange: (updates: Partial<SignupDraft>) => void; onContinue: () => void }) {
  const passwordIsValid = draft.password.length >= 8 && draft.password === draft.passwordConfirmation;

  return (
    <AuthScreen tone="pumpkin">
      <CharacterBackground src={signUpFourUrl} top={306} />
      <Progress step="password" />
      <BrandLogo />
      <h1 className="auth-title auth-title--password">CREA UNA<br />CONTRASEÑA</h1>
      <div className="auth-field-stack auth-field-stack--password">
        <input className="auth-field" type="password" autoComplete="new-password" value={draft.password} onChange={(event) => onChange({ password: event.target.value })} placeholder="Contraseña" aria-label="Contraseña" />
        <input className="auth-field" type="password" autoComplete="new-password" value={draft.passwordConfirmation} onChange={(event) => onChange({ passwordConfirmation: event.target.value })} placeholder="Repite la contraseña" aria-label="Repite la contraseña" />
      </div>
      <ContinueButton className="auth-continue-button--password" disabled={!passwordIsValid} onClick={onContinue} />
    </AuthScreen>
  );
}

function CertificateScreen({ error, submitting, onValidate }: { error: string | null; submitting: boolean; onValidate: () => void }) {
  return (
    <AuthScreen tone="orange">
      <Progress step="certificate" />
      <BrandLogo />
      <h1 className="auth-title auth-title--certificate">ADJUNTA TU<br />CERTIFICADO<br />DE ALUMNO<br />REGULAR</h1>
      <button className="auth-certificate-button" type="button" disabled={submitting} onClick={onValidate}>{submitting ? "Validando..." : "Adjuntar"}</button>
      {error && <p className="auth-form-error auth-form-error--certificate">{error}</p>}
    </AuthScreen>
  );
}

function ValidatedScreen({ auth, onComplete }: { auth: AuthResult; onComplete: (auth: AuthResult) => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(() => onComplete(auth), 1050);
    return () => window.clearTimeout(timeout);
  }, [auth, onComplete]);

  return (
    <AuthScreen tone="orange">
      <img className="auth-validated-check" src={validatedCheckUrl} alt="Certificado validado" />
    </AuthScreen>
  );
}

export function AuthFlow({ onComplete }: AuthFlowProps) {
  const [step, setStep] = useState<AuthStep>("welcome");
  const [draft, setDraft] = useState<SignupDraft>(emptySignupDraft);
  const [topics, setTopics] = useState<TopicCatalogItem[]>([]);
  const [faculties, setFaculties] = useState<FacultyCatalogItem[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatus>("loading");
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState<AuthResult | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalogs(): Promise<void> {
      setCatalogStatus("loading");

      try {
        const [nextTopics, nextFaculties] = await Promise.all([listTopics(controller.signal), listFaculties(controller.signal)]);

        if (controller.signal.aborted) return;

        setTopics(nextTopics);
        setFaculties(nextFaculties);
        setCatalogStatus("ready");
      } catch {
        if (!controller.signal.aborted) setCatalogStatus("error");
      }
    }

    void loadCatalogs();

    return () => controller.abort();
  }, []);

  function updateDraft(updates: Partial<SignupDraft>): void {
    setDraft((current) => ({ ...current, ...updates }));
  }

  async function handleSignup(): Promise<void> {
    const nameParts = draft.fullName.trim().split(/\s+/);
    const apellido = nameParts.pop() ?? "";

    setSubmitting(true);
    setSubmissionError(null);

    try {
      await register({
        email: draft.email.trim(),
        password: draft.password,
        legajo: Number(draft.legajo),
        nombre: nameParts.join(" "),
        apellido,
        id_facultad: Number(draft.facultyId),
        topicos: draft.topicIds.map(Number)
      });

      const auth = await login(draft.email.trim(), draft.password);
      setAuthenticated(auth);
      setStep("validated");
    } catch (requestError) {
      setSubmissionError(getAuthErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-flow-shell">
      {step === "welcome" && <WelcomeScreen onBegin={() => setStep("university")} onLogin={() => setStep("login")} />}
      {step === "login" && <LoginScreen onComplete={onComplete} />}
      {step === "university" && <UniversityScreen draft={draft} onChange={updateDraft} onContinue={() => setStep("interests")} />}
      {step === "interests" && <InterestsScreen draft={draft} topics={topics} status={catalogStatus} onChange={updateDraft} onContinue={() => setStep("profile")} />}
      {step === "profile" && <ProfileScreen draft={draft} faculties={faculties} status={catalogStatus} onChange={updateDraft} onContinue={() => setStep("password")} />}
      {step === "password" && <PasswordScreen draft={draft} onChange={updateDraft} onContinue={() => setStep("certificate")} />}
      {step === "certificate" && <CertificateScreen error={submissionError} submitting={submitting} onValidate={() => void handleSignup()} />}
      {step === "validated" && authenticated && <ValidatedScreen auth={authenticated} onComplete={onComplete} />}
    </div>
  );
}

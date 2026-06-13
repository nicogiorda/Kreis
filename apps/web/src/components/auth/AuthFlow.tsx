import { ArrowLeft, Plus } from "@phosphor-icons/react";
import { type ChangeEvent, type ReactNode, useEffect, useLayoutEffect, useState } from "react";
import { ApiRequestError, classifyCertificate, listFaculties, listTopics, login, register } from "../../api/auth";
import type { AuthResult, CertificateClassificationResult, FacultyCatalogItem, TopicCatalogItem } from "../../api/auth";
import onboardingEventsUrl from "../../assets/auth/onboarding-events.webp";
import signUpOneUrl from "../../assets/auth/signup-1.webp";
import signUpTwoUrl from "../../assets/auth/signup-2.webp";
import signUpThreeUrl from "../../assets/auth/signup-3.webp";
import signUpFourUrl from "../../assets/auth/signup-4.webp";
import wordmarkUrl from "../../assets/auth/welcome-wordmark.svg";
import invertedLogoUrl from "../../assets/brand/svgs/IMAGOTIPO-INVERTIDO.svg";
import greetingCharacterUrl from "../../assets/characters/kreisito_saludando.webp";
import { LoadingState } from "../common/LoadingState";
import { cn } from "../../utils/cn";
import { AuthDecorLayer, AuthScreenFrame, AuthShell } from "./AuthLayout";

type AuthFlowProps = {
  onComplete: (auth: AuthResult) => void;
};

type AuthStep = "welcome" | "events" | "communities" | "university" | "interests" | "profile" | "password" | "certificate" | "login";
type CatalogStatus = "loading" | "ready" | "error";

type SignupDraft = {
  university: string;
  legajo: string;
  topicIds: string[];
  fullName: string;
  emailUser: string;
  password: string;
  passwordConfirmation: string;
};

const authSafeAreaBackgrounds: Record<AuthStep, string> = {
  welcome: "#f7edda",
  events: "#2e4b3c",
  communities: "#ffa74f",
  university: "#2e4b3c",
  interests: "#ffa74f",
  profile: "#2e4b3c",
  password: "#ffa74f",
  certificate: "#2e4b3c",
  login: "#2e4b3c"
};

const emptySignupDraft: SignupDraft = {
  university: "",
  legajo: "",
  topicIds: [],
  fullName: "",
  emailUser: "",
  password: "",
  passwordConfirmation: ""
};

function BrandLogo({ variant = "right" }: { variant?: "right" | "right-university" | "right-low" | "right-certificate" | "center" | "login" }) {
  return <img className={cn("auth-redesign-logo", `auth-redesign-logo--${variant}`)} src={invertedLogoUrl} alt="Kreis" />;
}

function BackButton({ onClick, variant = "default" }: { onClick: () => void; variant?: "default" | "low" | "certificate" | "login" }) {
  return (
    <button className={cn("auth-redesign-back", `auth-redesign-back--${variant}`)} type="button" aria-label="Volver" onClick={onClick}>
      <ArrowLeft aria-hidden="true" weight="regular" />
    </button>
  );
}

function PrimaryButton({
  children,
  className,
  disabled = false,
  onClick
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={cn("auth-redesign-primary-button", className)} type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

function CharacterBackdrop({ src, className, top }: { src: string; className?: string; top?: number }) {
  return (
    <AuthDecorLayer>
      <img
        className={cn("auth-redesign-character-bg", className)}
        style={top === undefined ? undefined : { top: `${(top / 852) * 100}%` }}
        src={src}
        alt=""
      />
    </AuthDecorLayer>
  );
}

function TextField({
  className,
  label,
  type = "text",
  value,
  autoComplete,
  inputMode,
  suffix,
  onChange
}: {
  className: string;
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  autoComplete?: string;
  inputMode?: "numeric" | "email";
  suffix?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={cn("auth-redesign-field", className)}>
      <span className="sr-only">{label}</span>
      <input
        className={cn("auth-redesign-input", suffix && "auth-redesign-input--suffix")}
        type={type}
        value={value}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={label}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
      />
      {suffix ? <span className="auth-redesign-input-suffix">{suffix}</span> : null}
    </label>
  );
}

function SelectField({
  className,
  label,
  value,
  onChange
}: {
  className: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={cn("auth-redesign-field", className)}>
      <span className="sr-only">{label}</span>
      <select className="auth-redesign-input auth-redesign-select" value={value} aria-label={label} onChange={(event) => onChange(event.target.value)}>
        <option value="">{label}</option>
        <option value="uade">UADE</option>
      </select>
    </label>
  );
}

function getAuthErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.code === "invalid_credentials") return "El mail o la contraseña no coinciden.";
    if (error.code === "register_failed") return "No pudimos crear la cuenta. Revisá si el mail o el legajo ya están registrados.";
    if (error.code === "validation_error") return "Revisá los datos ingresados antes de continuar.";
    if (error.code === "certificate_too_large") return "El certificado no puede superar los 5 MB.";
    if (error.code === "invalid_certificate_file") return "El certificado debe ser un PDF.";
    if (error.code === "document_ai_config_error" || error.code === "document_ai_request_failed") return "No pudimos validar el certificado en este momento.";
  }

  return "No pudimos conectar con el servidor. Intentá nuevamente.";
}

function getDraftProfile(draft: SignupDraft): { nombre: string; apellido: string } {
  const nameParts = draft.fullName.trim().split(/\s+/).filter(Boolean);
  const apellido = nameParts.pop() ?? "";

  return {
    nombre: nameParts.join(" "),
    apellido
  };
}

function getSignupEmail(draft: SignupDraft): string {
  const rawValue = draft.emailUser.trim().toLowerCase();
  const userPart = rawValue.includes("@") ? rawValue.split("@")[0] : rawValue;

  return `${userPart}@uade.edu.ar`;
}

function getInvalidCertificateMessage(certificate: CertificateClassificationResult): string {
  if (!certificate.classificationValid) {
    const type = certificate.classification?.type;

    if (type === "formato_invalido_con_datos") return "El archivo tiene datos, pero no cumple el formato esperado.";
    if (type === "otro_documento_universitario") return "El documento parece universitario, pero no es un certificado de alumno regular.";

    return "Subí una constancia de alumno regular válida.";
  }

  if (certificate.validation?.errors.length) return certificate.validation.errors[0];

  return "Los datos del certificado no coinciden con los datos ingresados.";
}

function WelcomeScreen({ onBegin, onLogin }: { onBegin: () => void; onLogin: () => void }) {
  return (
    <AuthScreenFrame tone="lace">
      <div className="auth-redesign-welcome-character">
        <span className="auth-redesign-character-shadow" aria-hidden="true" />
        <img src={greetingCharacterUrl} alt="" aria-hidden="true" />
      </div>
      <img className="auth-redesign-welcome-wordmark" src={wordmarkUrl} alt="Kreis" />
      <p className="auth-redesign-welcome-copy">Conecta con otros estudiantes y viví la vida universitaria que tanto soñaste.</p>
      <button className="auth-redesign-welcome-button auth-redesign-welcome-button--primary" type="button" onClick={onBegin}>Comenzar</button>
      <button className="auth-redesign-welcome-button auth-redesign-welcome-button--secondary" type="button" onClick={onLogin}>Ya tengo cuenta</button>
    </AuthScreenFrame>
  );
}

function OnboardingEventsScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <AuthScreenFrame tone="green">
      <BrandLogo variant="center" />
      <img className="auth-redesign-onboarding-character auth-redesign-onboarding-character--events" src={onboardingEventsUrl} alt="" aria-hidden="true" />
      <span className="auth-redesign-character-shadow auth-redesign-character-shadow--onboarding" aria-hidden="true" />
      <h1 className="auth-redesign-onboarding-title">Eventos</h1>
      <p className="auth-redesign-onboarding-copy">Enterate de todos los eventos y mostrá interés en ellos.</p>
      <div className="auth-redesign-dots" aria-hidden="true">
        <span className="is-active" />
        <span />
      </div>
      <PrimaryButton className="auth-redesign-onboarding-button auth-redesign-button--green-text" onClick={onContinue}>Continuar</PrimaryButton>
    </AuthScreenFrame>
  );
}

function OnboardingCommunitiesScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <AuthScreenFrame tone="pumpkin">
      <BrandLogo variant="center" />
      <img className="auth-redesign-onboarding-character auth-redesign-onboarding-character--communities" src={greetingCharacterUrl} alt="" aria-hidden="true" />
      <span className="auth-redesign-character-shadow auth-redesign-character-shadow--onboarding" aria-hidden="true" />
      <h1 className="auth-redesign-onboarding-title">Comunidades</h1>
      <p className="auth-redesign-onboarding-copy">Unite a comunidades y forma parte de lo que mas te gusta.</p>
      <div className="auth-redesign-dots" aria-hidden="true">
        <span />
        <span className="is-active" />
      </div>
      <PrimaryButton className="auth-redesign-onboarding-button auth-redesign-button--pumpkin-text" onClick={onContinue}>Registrarse</PrimaryButton>
    </AuthScreenFrame>
  );
}

function UniversityScreen({
  draft,
  onBack,
  onChange,
  onContinue
}: {
  draft: SignupDraft;
  onBack: () => void;
  onChange: (updates: Partial<SignupDraft>) => void;
  onContinue: () => void;
}) {
  return (
    <AuthScreenFrame tone="green">
      <CharacterBackdrop src={signUpOneUrl} />
      <BackButton onClick={onBack} />
      <BrandLogo variant="right-university" />
      <h1 className="auth-redesign-title auth-redesign-title--university">
        <span>ELIGE TU</span>
        <span>UNIVERSIDAD</span>
      </h1>
      <SelectField className="auth-redesign-field--university" label="Selecciona una universidad" value={draft.university} onChange={(university) => onChange({ university })} />
      <TextField
        className="auth-redesign-field--student-id"
        label="Ingresa tu legajo"
        value={draft.legajo}
        inputMode="numeric"
        autoComplete="off"
        onChange={(legajo) => onChange({ legajo: legajo.replace(/\D/g, "") })}
      />
      <PrimaryButton className="auth-redesign-form-button auth-redesign-form-button--bottom auth-redesign-button--orange-text" disabled={!draft.university || !draft.legajo} onClick={onContinue}>Continuar</PrimaryButton>
    </AuthScreenFrame>
  );
}

function InterestsScreen({
  draft,
  topics,
  status,
  onBack,
  onChange,
  onContinue,
  onRetry
}: {
  draft: SignupDraft;
  topics: TopicCatalogItem[];
  status: CatalogStatus;
  onBack: () => void;
  onChange: (updates: Partial<SignupDraft>) => void;
  onContinue: () => void;
  onRetry: () => void;
}) {
  const actionDisabled = status === "loading" || (status === "ready" && draft.topicIds.length < 3);

  function toggleInterest(topicId: string): void {
    onChange({
      topicIds: draft.topicIds.includes(topicId)
        ? draft.topicIds.filter((item) => item !== topicId)
        : [...draft.topicIds, topicId]
    });
  }

  return (
    <AuthScreenFrame tone="pumpkin">
      <CharacterBackdrop src={signUpTwoUrl} />
      <BackButton onClick={onBack} />
      <BrandLogo />
      <h1 className="auth-redesign-title auth-redesign-title--interests">
        <span>¿CUALES SON</span>
        <span>TUS INTERESES?</span>
      </h1>
      <p className="auth-redesign-note">Seleccione mínimo 3 categorías.</p>
      <div className="auth-redesign-interest-grid" aria-label="Seleccionar intereses">
        {status === "loading" ? Array.from({ length: 9 }, (_, index) => (
          <span className="auth-redesign-interest-pill auth-redesign-interest-pill--loading" key={index} />
        )) : topics.map((topic) => (
          <button
            className={cn("auth-redesign-interest-pill", draft.topicIds.includes(topic.id_topico) && "is-selected")}
            type="button"
            key={topic.id_topico}
            aria-label={topic.topico}
            aria-pressed={draft.topicIds.includes(topic.id_topico)}
            onClick={() => toggleInterest(topic.id_topico)}
          >
            {topic.topico}
          </button>
        ))}
      </div>
      {status === "error" ? <button className="auth-redesign-error auth-redesign-error--interests" type="button" onClick={onRetry}>No pudimos cargar los intereses. Reintentar</button> : null}
      <PrimaryButton className="auth-redesign-form-button auth-redesign-form-button--bottom auth-redesign-button--orange-text" disabled={actionDisabled} onClick={status === "error" ? onRetry : onContinue}>
        {status === "error" ? "Reintentar" : "Continuar"}
      </PrimaryButton>
    </AuthScreenFrame>
  );
}

function ProfileScreen({
  draft,
  onBack,
  onChange,
  onContinue
}: {
  draft: SignupDraft;
  onBack: () => void;
  onChange: (updates: Partial<SignupDraft>) => void;
  onContinue: () => void;
}) {
  const hasFullName = draft.fullName.trim().split(/\s+/).length >= 2;
  const hasEmailUser = /^[a-z0-9._%+-]+$/i.test(draft.emailUser.trim());

  return (
    <AuthScreenFrame tone="green">
      <CharacterBackdrop src={signUpThreeUrl} top={301} />
      <BackButton variant="low" onClick={onBack} />
      <BrandLogo variant="right-low" />
      <h1 className="auth-redesign-title auth-redesign-title--profile">
        <span>CREA TU</span>
        <span>USUARIO</span>
      </h1>
      <TextField
        className="auth-redesign-field--name"
        label="Nombre y Apellido"
        value={draft.fullName}
        autoComplete="name"
        onChange={(fullName) => onChange({ fullName })}
      />
      <TextField
        className="auth-redesign-field--signup-email"
        label="Mail universitario"
        value={draft.emailUser}
        autoComplete="email"
        inputMode="email"
        suffix="@uade.edu.ar"
        onChange={(emailUser) => onChange({ emailUser: emailUser.replace(/@.*$/, "") })}
      />
      <PrimaryButton className="auth-redesign-form-button auth-redesign-form-button--profile auth-redesign-button--green-text" disabled={!hasFullName || !hasEmailUser} onClick={onContinue}>Continuar</PrimaryButton>
    </AuthScreenFrame>
  );
}

function PasswordScreen({
  draft,
  onBack,
  onChange,
  onContinue
}: {
  draft: SignupDraft;
  onBack: () => void;
  onChange: (updates: Partial<SignupDraft>) => void;
  onContinue: () => void;
}) {
  const passwordIsValid = draft.password.length >= 8 && draft.password === draft.passwordConfirmation;

  return (
    <AuthScreenFrame tone="pumpkin">
      <CharacterBackdrop src={signUpFourUrl} top={306} />
      <BackButton variant="low" onClick={onBack} />
      <BrandLogo variant="right-low" />
      <h1 className="auth-redesign-title auth-redesign-title--password">
        <span>CREA UNA</span>
        <span>CONTRASEÑA</span>
      </h1>
      <TextField className="auth-redesign-field--password" label="Ingresa una contraseña" type="password" value={draft.password} autoComplete="new-password" onChange={(password) => onChange({ password })} />
      <TextField className="auth-redesign-field--password-repeat" label="Repita la contraseña" type="password" value={draft.passwordConfirmation} autoComplete="new-password" onChange={(passwordConfirmation) => onChange({ passwordConfirmation })} />
      <PrimaryButton className="auth-redesign-form-button auth-redesign-form-button--password auth-redesign-button--pumpkin-text" disabled={!passwordIsValid} onClick={onContinue}>Continuar</PrimaryButton>
    </AuthScreenFrame>
  );
}

function CertificateScreen({
  error,
  fileName,
  submitting,
  onBack,
  onFileSelect,
  onSubmit
}: {
  error: string | null;
  fileName: string | null;
  submitting: boolean;
  onBack: () => void;
  onFileSelect: (file: File | null) => void;
  onSubmit: () => void;
}) {
  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    onFileSelect(event.target.files?.[0] ?? null);
  }

  return (
    <AuthScreenFrame tone="green">
      <BackButton variant="certificate" onClick={onBack} />
      <BrandLogo variant="right-certificate" />
      <h1 className="auth-redesign-title auth-redesign-title--certificate">
        <span>CERTIFICADO</span>
        <span>DE ALUMNO</span>
        <span>REGULAR</span>
      </h1>
      <label className="auth-redesign-certificate-upload">
        <input className="auth-redesign-file-input" type="file" accept="application/pdf" disabled={submitting} onChange={handleFileChange} />
        {submitting ? (
          <LoadingState label="Validando certificado" variant="button" />
        ) : (
          <>
            <span className="auth-redesign-upload-plus" aria-hidden="true"><Plus weight="regular" /></span>
            <span className="auth-redesign-upload-copy">{fileName || "Subí tu certificado"}</span>
          </>
        )}
      </label>
      <p className="auth-redesign-certificate-help">¿No sabes donde encontrarlo?</p>
      {error ? <p className="auth-redesign-error auth-redesign-error--certificate">{error}</p> : null}
      <PrimaryButton className="auth-redesign-form-button auth-redesign-form-button--certificate auth-redesign-button--green-text" disabled={submitting || !fileName} onClick={onSubmit}>
        {submitting ? <LoadingState label="Validando certificado" variant="button" /> : "Validar"}
      </PrimaryButton>
    </AuthScreenFrame>
  );
}

function LoginScreen({ onBack, onComplete }: { onBack: () => void; onComplete: (auth: AuthResult) => void }) {
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
    <AuthScreenFrame tone="green">
      <CharacterBackdrop src={signUpThreeUrl} top={279} />
      <BackButton variant="login" onClick={onBack} />
      <BrandLogo variant="login" />
      <h1 className="auth-redesign-title auth-redesign-title--login">INICIA SESIÓN</h1>
      <TextField className="auth-redesign-field--login-email" label="Ingresa tu mail" type="email" value={email} autoComplete="email" inputMode="email" onChange={setEmail} />
      <TextField className="auth-redesign-field--login-password" label="Ingresa tu contraseña" type="password" value={password} autoComplete="current-password" onChange={setPassword} />
      <PrimaryButton className="auth-redesign-form-button auth-redesign-form-button--login auth-redesign-button--green-text" disabled={submitting || !email.trim() || password.length < 8} onClick={() => void handleLogin()}>
        {submitting ? <LoadingState label="Ingresando" variant="button" /> : "Continuar"}
      </PrimaryButton>
      {error ? <p className="auth-redesign-error auth-redesign-error--login">{error}</p> : null}
    </AuthScreenFrame>
  );
}

export function AuthFlow({ onComplete }: AuthFlowProps) {
  const [step, setStep] = useState<AuthStep>("welcome");
  const [draft, setDraft] = useState<SignupDraft>(emptySignupDraft);
  const [topics, setTopics] = useState<TopicCatalogItem[]>([]);
  const [faculties, setFaculties] = useState<FacultyCatalogItem[]>([]);
  const [topicsStatus, setTopicsStatus] = useState<CatalogStatus>("loading");
  const [catalogReloadKey, setCatalogReloadKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateFileName, setCertificateFileName] = useState<string | null>(null);

  useEffect(() => {
    function preventViewportScroll(event: Event): void {
      event.preventDefault();
    }

    document.documentElement.classList.add("auth-scroll-lock");
    window.addEventListener("touchmove", preventViewportScroll, { passive: false });
    window.addEventListener("wheel", preventViewportScroll, { passive: false });

    return () => {
      document.documentElement.classList.remove("auth-scroll-lock");
      window.removeEventListener("touchmove", preventViewportScroll);
      window.removeEventListener("wheel", preventViewportScroll);
    };
  }, []);

  useLayoutEffect(() => {
    document.documentElement.style.setProperty("--auth-safe-area-bg", authSafeAreaBackgrounds[step]);

    return () => {
      document.documentElement.style.removeProperty("--auth-safe-area-bg");
    };
  }, [step]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalogs(): Promise<void> {
      setTopicsStatus("loading");

      try {
        const [nextTopics, nextFaculties] = await Promise.all([
          listTopics(controller.signal),
          listFaculties(controller.signal).catch(() => [])
        ]);

        if (controller.signal.aborted) return;

        setTopics(nextTopics);
        setFaculties(nextFaculties);
        setTopicsStatus("ready");
      } catch {
        if (!controller.signal.aborted) setTopicsStatus("error");
      }
    }

    void loadCatalogs();

    return () => controller.abort();
  }, [catalogReloadKey]);

  function updateDraft(updates: Partial<SignupDraft>): void {
    setDraft((current) => ({ ...current, ...updates }));
  }

  function updateCertificateFile(file: File | null): void {
    setCertificateFile(file);
    setCertificateFileName(file?.name ?? null);
    setSubmissionError(null);
  }

  async function handleSignup(certificateFile: File): Promise<void> {
    setSubmitting(true);
    setSubmissionError(null);

    try {
      const profile = getDraftProfile(draft);
      const certificate = await classifyCertificate(certificateFile, {
        legajo: Number(draft.legajo),
        nombre: profile.nombre,
        apellido: profile.apellido
      });

      if (!certificate.valid) {
        setSubmissionError(getInvalidCertificateMessage(certificate));
        return;
      }

      const facultyId = Number(faculties[0]?.id_facultad ?? 1);
      const email = getSignupEmail(draft);

      await register({
        email,
        password: draft.password,
        legajo: Number(draft.legajo),
        nombre: profile.nombre,
        apellido: profile.apellido,
        id_facultad: facultyId,
        topicos: draft.topicIds.map(Number)
      });

      onComplete(await login(email, draft.password));
    } catch (requestError) {
      setSubmissionError(getAuthErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      {step === "welcome" && <WelcomeScreen onBegin={() => setStep("events")} onLogin={() => setStep("login")} />}
      {step === "events" && <OnboardingEventsScreen onContinue={() => setStep("communities")} />}
      {step === "communities" && <OnboardingCommunitiesScreen onContinue={() => setStep("university")} />}
      {step === "university" && <UniversityScreen draft={draft} onBack={() => setStep("communities")} onChange={updateDraft} onContinue={() => setStep("interests")} />}
      {step === "interests" && <InterestsScreen draft={draft} topics={topics} status={topicsStatus} onBack={() => setStep("university")} onChange={updateDraft} onContinue={() => setStep("profile")} onRetry={() => setCatalogReloadKey((current) => current + 1)} />}
      {step === "profile" && <ProfileScreen draft={draft} onBack={() => setStep("interests")} onChange={updateDraft} onContinue={() => setStep("password")} />}
      {step === "password" && <PasswordScreen draft={draft} onBack={() => setStep("profile")} onChange={updateDraft} onContinue={() => setStep("certificate")} />}
      {step === "certificate" && (
        <CertificateScreen
          error={submissionError}
          fileName={certificateFileName}
          submitting={submitting}
          onBack={() => setStep("password")}
          onFileSelect={updateCertificateFile}
          onSubmit={() => {
            if (certificateFile) void handleSignup(certificateFile);
          }}
        />
      )}
      {step === "login" && <LoginScreen onBack={() => setStep("welcome")} onComplete={onComplete} />}
    </AuthShell>
  );
}

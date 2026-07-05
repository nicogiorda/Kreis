import { ArrowLeft, CheckCircle, Eye, EyeSlash, Plus, X } from "@phosphor-icons/react";
import {
  type ChangeEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import {
  ApiRequestError,
  classifyCertificate,
  listTopics,
  register,
  startRegistrationEmailVerification,
  verifyRegistrationEmail
} from "../../api/auth";
import type {
  CertificateClassificationResult,
  CertificateVerification,
  RegistrationEmailVerification,
  TopicCatalogItem
} from "../../api/auth";
import onboardingEventsUrl from "../../assets/auth/onboarding-events.webp";
import signUpOneUrl from "../../assets/auth/signup-1.webp";
import signUpTwoUrl from "../../assets/auth/signup-2.webp";
import signUpThreeUrl from "../../assets/auth/signup-3.webp";
import signUpFourUrl from "../../assets/auth/signup-4.webp";
import certificateGuideUrl from "../../assets/auth/guia_certificado.png";
import wordmarkUrl from "../../assets/auth/welcome-wordmark.svg";
import invertedLogoUrl from "../../assets/brand/svgs/IMAGOTIPO-INVERTIDO.svg";
import greetingCharacterUrl from "../../assets/characters/kreisito_saludando.webp";
import { LoadingState } from "../common/LoadingState";
import { cn } from "../../utils/cn";
import { useAuth } from "../../auth/useAuth";
import {
  normalizeEmailOtp,
  SUPABASE_EMAIL_OTP_LENGTH
} from "../../auth/email-otp";
import { AuthDecorLayer, AuthScreenFrame, AuthShell } from "./AuthLayout";

type AuthStep =
  | "welcome"
  | "events"
  | "communities"
  | "university"
  | "interests"
  | "profile"
  | "password"
  | "certificate"
  | "login"
  | "signup-code"
  | "forgot-email"
  | "forgot-code";
type CatalogStatus = "loading" | "ready" | "error";
const otpResendCooldownSeconds = 60;

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
  login: "#2e4b3c",
  "signup-code": "#2e4b3c",
  "forgot-email": "#2e4b3c",
  "forgot-code": "#2e4b3c"
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

function PasswordField({
  className,
  label,
  value,
  autoComplete,
  visible,
  onChange,
  onToggleVisibility
}: {
  className: string;
  label: string;
  value: string;
  autoComplete: "current-password" | "new-password";
  visible: boolean;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
}) {
  return (
    <label className={cn("auth-redesign-field auth-redesign-password-field", className)}>
      <span className="sr-only">{label}</span>
      <input
        className="auth-redesign-input auth-redesign-input--password-toggle"
        type={visible ? "text" : "password"}
        value={value}
        autoComplete={autoComplete}
        placeholder={label}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        className="auth-redesign-password-toggle"
        type="button"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        onClick={onToggleVisibility}
      >
        {visible ? <EyeSlash aria-hidden="true" weight="regular" /> : <Eye aria-hidden="true" weight="regular" />}
      </button>
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
  const authError = error as { code?: string; status?: number };

  if (authError.code === "invalid_credentials") return "El mail o la contraseña no coinciden.";

  if (error instanceof ApiRequestError) {
    if (error.code === "invalid_credentials") return "El mail o la contraseña no coinciden.";
    if (error.code === "register_failed") return "No pudimos crear la cuenta. Revisá si el mail o el legajo ya están registrados.";
    if (error.code === "profile_creation_failed") return "El legajo o el correo ya están asociados a otra cuenta.";
    if (error.code === "registration_already_exists") return "No pudimos crear la cuenta. Revisá si el mail o el legajo ya están registrados.";
    if (error.code === "validation_error") return "Revisá los datos ingresados antes de continuar.";
    if (error.code === "invalid_email_domain") return "Usá el correo universitario de una institución habilitada.";
    if (error.code === "registration_email_delivery_failed") return "No pudimos enviar el código. Intentá nuevamente.";
    if (error.code === "email_verification_rate_limited") return "Hubo demasiados intentos. Esperá un momento.";
    if (error.code === "email_verification_expired") return "La verificación del correo venció. Volvé a verificar tu mail.";
    if (error.code === "email_verification_attempts_exceeded") return "Se alcanzó el máximo de intentos. Solicitá un código nuevo.";
    if (
      error.code === "email_verification_invalid" ||
      error.code === "email_verification_required" ||
      error.code === "email_verification_mismatch" ||
      error.code === "email_verification_used"
    ) {
      return "Necesitamos verificar nuevamente tu correo para continuar.";
    }
    if (error.code === "certificate_too_large") return "El certificado no puede superar los 5 MB.";
    if (error.code === "invalid_certificate_file") return "El certificado debe ser un PDF.";
    if (error.code === "document_ai_config_error" || error.code === "document_ai_request_failed") return "No pudimos validar el certificado en este momento.";
    if (error.code === "certificate_verification_expired") return "La validación del certificado venció. Volvé a cargarlo para continuar.";
    if (error.code === "certificate_verification_used") return "La validación del certificado ya fue utilizada. Volvé a cargarlo para continuar.";
    if (error.code === "certificate_verification_mismatch") return "Los datos cambiaron después de validar el certificado. Volvé a cargarlo.";
    if (error.code === "certificate_verification_invalid" || error.code === "certificate_verification_required") {
      return "Necesitamos validar nuevamente tu certificado para continuar.";
    }
  }

  return "No pudimos conectar con el servidor. Intentá nuevamente.";
}

function isCertificateVerificationError(error: unknown): boolean {
  return error instanceof ApiRequestError && [
    "certificate_verification_required",
    "certificate_verification_invalid",
    "certificate_verification_expired",
    "certificate_verification_used",
    "certificate_verification_mismatch"
  ].includes(error.code);
}

function isEmailVerificationError(error: unknown): boolean {
  return error instanceof ApiRequestError && [
    "email_verification_required",
    "email_verification_invalid",
    "email_verification_expired",
    "email_verification_used",
    "email_verification_mismatch",
    "email_verification_attempts_exceeded"
  ].includes(error.code);
}

function getRecoveryRequestErrorMessage(error: unknown): string {
  const authError = error as { code?: string; status?: number };

  if (authError.status === 429 || authError.code === "over_email_send_rate_limit") {
    return "Esperá un momento antes de solicitar otro código.";
  }

  return "No pudimos enviar el código. Revisá tu conexión e intentá nuevamente.";
}

function getRecoveryCodeErrorMessage(error: unknown): string {
  const authError = error as { code?: string; status?: number; message?: string };
  const errorText = `${authError.code ?? ""} ${authError.message ?? ""}`.toLowerCase();

  if (errorText.includes("expired")) return "El código venció. Solicitá uno nuevo.";
  if (errorText.includes("used")) return "Ese código ya fue utilizado. Solicitá uno nuevo.";
  if (authError.status === 429) return "Hubo demasiados intentos. Esperá un momento.";

  return "El código no es válido. Revisalo e intentá nuevamente.";
}

function isEmailNotConfirmedError(error: unknown): boolean {
  const authError = error as { code?: string; message?: string };
  const errorText = `${authError.code ?? ""} ${authError.message ?? ""}`.toLowerCase();

  return authError.code === "email_not_confirmed" || errorText.includes("email not confirmed");
}

function getSignupCodeErrorMessage(error: unknown): string {
  const authError = error as { code?: string; status?: number; message?: string };
  const errorText = `${authError.code ?? ""} ${authError.message ?? ""}`.toLowerCase();

  if (errorText.includes("expired")) return "El código venció. Solicitá uno nuevo.";
  if (errorText.includes("used")) return "Ese código ya fue utilizado. Solicitá uno nuevo.";
  if (authError.status === 429 || errorText.includes("rate")) {
    return "Hubo demasiados intentos. Esperá un momento.";
  }

  return "El código no es válido. Revisalo e intentá nuevamente.";
}

function getSignupResendErrorMessage(error: unknown): string {
  const authError = error as { status?: number; code?: string };
  if (authError.status === 429 || authError.code === "over_email_send_rate_limit") {
    return "Esperá un momento antes de solicitar otro código.";
  }

  return "No pudimos reenviar el código. Intentá nuevamente.";
}

function getPasswordUpdateErrorMessage(error: unknown): string {
  const authError = error as { code?: string; message?: string };
  const errorText = `${authError.code ?? ""} ${authError.message ?? ""}`.toLowerCase();

  if (errorText.includes("same_password")) return "La nueva contraseña debe ser diferente.";
  if (errorText.includes("weak") || errorText.includes("password")) {
    return "La contraseña no cumple los requisitos de seguridad.";
  }

  return "No pudimos actualizar la contraseña. Intentá nuevamente.";
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
      <p className="auth-redesign-welcome-legal">
        Al continuar, aceptás nuestros{" "}
        <a href="/terminos" target="_blank" rel="noopener noreferrer">Términos y condiciones</a>
        {" "}y nuestra{" "}
        <a href="/privacidad" target="_blank" rel="noopener noreferrer">Política de privacidad</a>.
      </p>
    </AuthScreenFrame>
  );
}

function OnboardingEventsScreen({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  return (
    <AuthScreenFrame tone="green">
      <BackButton onClick={onBack} />
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

function OnboardingCommunitiesScreen({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  return (
    <AuthScreenFrame tone="pumpkin">
      <BackButton onClick={onBack} />
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
  error,
  onBack,
  onChange,
  onContinue,
  submitting
}: {
  draft: SignupDraft;
  error: string | null;
  onBack: () => void;
  onChange: (updates: Partial<SignupDraft>) => void;
  onContinue: () => void;
  submitting: boolean;
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
      {error ? <p className="auth-redesign-error auth-redesign-error--profile" role="alert">{error}</p> : null}
      <PrimaryButton className="auth-redesign-form-button auth-redesign-form-button--profile auth-redesign-button--green-text" disabled={submitting || !hasFullName || !hasEmailUser} onClick={onContinue}>
        {submitting ? <LoadingState label="Enviando código" variant="button" /> : "Continuar"}
      </PrimaryButton>
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
  const [guideOpen, setGuideOpen] = useState(false);

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
      <button className="auth-redesign-certificate-help" type="button" onClick={() => setGuideOpen(true)}>¿No sabes donde encontrarlo?</button>
      {error ? <p className="auth-redesign-error auth-redesign-error--certificate">{error}</p> : null}
      <PrimaryButton className="auth-redesign-form-button auth-redesign-form-button--certificate auth-redesign-button--green-text" disabled={submitting || !fileName} onClick={onSubmit}>
        {submitting ? <LoadingState label="Validando certificado" variant="button" /> : "Validar"}
      </PrimaryButton>
      {guideOpen ? (
        <section className="auth-redesign-certificate-guide" role="dialog" aria-modal="true" aria-label="Como descargar tu certificado">
          <div className="auth-redesign-certificate-guide-panel">
            <button className="auth-redesign-certificate-guide-close" type="button" aria-label="Cerrar guia" onClick={() => setGuideOpen(false)}>
              <X aria-hidden="true" weight="bold" />
            </button>
            <h2 className="auth-redesign-certificate-guide-title">Como descargarlo</h2>
            <img className="auth-redesign-certificate-guide-image" src={certificateGuideUrl} alt="Guia para descargar el certificado de alumno regular" />
            <button className="auth-redesign-certificate-guide-button" type="button" onClick={() => setGuideOpen(false)}>Entendido</button>
          </div>
        </section>
      ) : null}
    </AuthScreenFrame>
  );
}

function LoginScreen({
  notice,
  onBack,
  onForgotPassword,
  onEmailConfirmationRequired
}: {
  notice?: string | null;
  onBack: () => void;
  onForgotPassword: () => void;
  onEmailConfirmationRequired: (email: string) => void;
}) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(): Promise<void> {
    setSubmitting(true);
    setError(null);

    try {
      await signIn(email.trim(), password);
    } catch (requestError) {
      if (isEmailNotConfirmedError(requestError)) {
        setPassword("");
        onEmailConfirmationRequired(email.trim().toLowerCase());
        return;
      }

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
      <button className="auth-redesign-forgot-link" type="button" onClick={onForgotPassword}>¿Olvidaste tu contraseña?</button>
      <PrimaryButton className="auth-redesign-form-button auth-redesign-form-button--login auth-redesign-button--green-text" disabled={submitting || !email.trim() || password.length < 8} onClick={() => void handleLogin()}>
        {submitting ? <LoadingState label="Ingresando" variant="button" /> : "Continuar"}
      </PrimaryButton>
      {notice && !error ? <p className="auth-redesign-notice auth-redesign-notice--login" role="status">{notice}</p> : null}
      {error ? <p className="auth-redesign-error auth-redesign-error--login" role="alert">{error}</p> : null}
    </AuthScreenFrame>
  );
}

function ForgotEmailScreen({
  initialEmail,
  onBack,
  onCodeSent
}: {
  initialEmail: string;
  onBack: () => void;
  onCodeSent: (email: string) => void;
}) {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const normalizedEmail = email.trim().toLowerCase();
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  async function handleRequest(): Promise<void> {
    if (!emailIsValid) return;

    setSubmitting(true);
    setError(null);

    try {
      await requestPasswordReset(normalizedEmail);
      onCodeSent(normalizedEmail);
    } catch (requestError) {
      setError(getRecoveryRequestErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreenFrame tone="green">
      <CharacterBackdrop src={signUpThreeUrl} top={430} />
      <BackButton variant="login" onClick={onBack} />
      <BrandLogo variant="right-low" />
      <h1 className="auth-redesign-title auth-redesign-title--recovery" ref={titleRef} tabIndex={-1}>
        RECUPERÁ TU CUENTA
      </h1>
      <p className="auth-redesign-recovery-copy auth-redesign-recovery-copy--email">
        Ingresá el correo asociado a tu cuenta y te enviaremos un código.
      </p>
      <TextField
        className="auth-redesign-field--recovery-email"
        label="Correo electrónico"
        type="email"
        value={email}
        autoComplete="email"
        inputMode="email"
        onChange={setEmail}
      />
      <PrimaryButton
        className="auth-redesign-form-button auth-redesign-form-button--recovery-email auth-redesign-button--green-text"
        disabled={submitting || !emailIsValid}
        onClick={() => void handleRequest()}
      >
        {submitting ? <LoadingState label="Enviando código" variant="button" /> : "Enviar código"}
      </PrimaryButton>
      {error ? <p className="auth-redesign-error auth-redesign-error--recovery" role="alert">{error}</p> : null}
    </AuthScreenFrame>
  );
}

function OtpCodeField({
  code,
  inputRef,
  label,
  onChange
}: {
  code: string;
  inputRef: RefObject<HTMLInputElement | null>;
  label: string;
  onChange: (code: string) => void;
}) {
  return (
    <label className="auth-redesign-otp-field">
      <span className="sr-only">{label}</span>
      <input
        ref={inputRef}
        className="auth-redesign-otp-input"
        type="text"
        value={code}
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        onChange={(event) => onChange(normalizeEmailOtp(event.target.value))}
      />
      <span className="auth-redesign-otp-cells" aria-hidden="true">
        {Array.from({ length: SUPABASE_EMAIL_OTP_LENGTH }, (_, index) => (
          <span className={cn(code[index] && "is-filled")} key={index}>
            {code[index] ?? ""}
          </span>
        ))}
      </span>
    </label>
  );
}

function ForgotCodeScreen({
  email,
  onBack
}: {
  email: string;
  onBack: () => void;
}) {
  const { requestPasswordReset, verifyRecoveryCode } = useAuth();
  const [code, setCode] = useState("");
  const [secondsUntilResend, setSecondsUntilResend] = useState(
    otpResendCooldownSeconds
  );
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    titleRef.current?.focus();
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (secondsUntilResend <= 0) return;

    const timeoutId = window.setTimeout(() => {
      setSecondsUntilResend((current) => Math.max(0, current - 1));
    }, 1_000);

    return () => window.clearTimeout(timeoutId);
  }, [secondsUntilResend]);

  async function handleVerify(): Promise<void> {
    if (code.length !== SUPABASE_EMAIL_OTP_LENGTH) return;

    setSubmitting(true);
    setError(null);

    try {
      await verifyRecoveryCode(email, code);
    } catch (verificationError) {
      setError(getRecoveryCodeErrorMessage(verificationError));
      setSubmitting(false);
    }
  }

  async function handleResend(): Promise<void> {
    if (secondsUntilResend > 0 || resending) return;

    setResending(true);
    setError(null);

    try {
      await requestPasswordReset(email);
      setSecondsUntilResend(otpResendCooldownSeconds);
      setCode("");
      inputRef.current?.focus();
    } catch (requestError) {
      setError(getRecoveryRequestErrorMessage(requestError));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthScreenFrame tone="green">
      <CharacterBackdrop src={signUpThreeUrl} top={470} />
      <BackButton variant="login" onClick={onBack} />
      <BrandLogo variant="right-low" />
      <h1 className="auth-redesign-title auth-redesign-title--recovery-code" ref={titleRef} tabIndex={-1}>
        INGRESÁ EL CÓDIGO
      </h1>
      <p className="auth-redesign-recovery-copy auth-redesign-recovery-copy--code">
        Si existe una cuenta asociada, te enviamos un código.
      </p>
      <OtpCodeField
        code={code}
        inputRef={inputRef}
        label="Código de recuperación"
        onChange={setCode}
      />
      <button
        className="auth-redesign-resend"
        type="button"
        disabled={secondsUntilResend > 0 || resending}
        onClick={() => void handleResend()}
      >
        {secondsUntilResend > 0
          ? `Reenviar en 00:${String(secondsUntilResend).padStart(2, "0")}`
          : resending
            ? "Reenviando..."
            : "¿No te llegó? Reenviar código"}
      </button>
      <PrimaryButton
        className="auth-redesign-form-button auth-redesign-form-button--recovery-code auth-redesign-button--green-text"
        disabled={submitting || code.length !== SUPABASE_EMAIL_OTP_LENGTH}
        onClick={() => void handleVerify()}
      >
        {submitting ? <LoadingState label="Validando código" variant="button" /> : "Validar código"}
      </PrimaryButton>
      {error ? <p className="auth-redesign-error auth-redesign-error--recovery-code" role="alert">{error}</p> : null}
    </AuthScreenFrame>
  );
}

function SignupCodeScreen({
  email,
  initialError = null,
  onBack,
  onResend,
  onVerify
}: {
  email: string;
  initialError?: string | null;
  onBack: () => void;
  onResend: () => Promise<void>;
  onVerify: (code: string) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [secondsUntilResend, setSecondsUntilResend] = useState(
    otpResendCooldownSeconds
  );
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    titleRef.current?.focus();
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (secondsUntilResend <= 0) return;

    const timeoutId = window.setTimeout(() => {
      setSecondsUntilResend((current) => Math.max(0, current - 1));
    }, 1_000);

    return () => window.clearTimeout(timeoutId);
  }, [secondsUntilResend]);

  async function handleVerify(): Promise<void> {
    if (code.length !== SUPABASE_EMAIL_OTP_LENGTH) return;

    setSubmitting(true);
    setError(null);

    try {
      await onVerify(code);
      setCode("");
    } catch (verificationError) {
      setError(getSignupCodeErrorMessage(verificationError));
      setSubmitting(false);
    }
  }

  async function handleResend(): Promise<void> {
    if (secondsUntilResend > 0 || resending) return;

    setResending(true);
    setError(null);

    try {
      await onResend();
      setSecondsUntilResend(otpResendCooldownSeconds);
      setCode("");
      inputRef.current?.focus();
    } catch (resendError) {
      setError(getSignupResendErrorMessage(resendError));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthScreenFrame tone="green">
      <CharacterBackdrop src={signUpThreeUrl} top={470} />
      <BackButton variant="login" onClick={onBack} />
      <BrandLogo variant="right-low" />
      <h1
        className="auth-redesign-title auth-redesign-title--recovery-code"
        ref={titleRef}
        tabIndex={-1}
      >
        VERIFICÁ TU CORREO
      </h1>
      <p className="auth-redesign-recovery-copy auth-redesign-recovery-copy--code">
        Enviamos un código a {email}.
      </p>
      <OtpCodeField
        code={code}
        inputRef={inputRef}
        label="Código de verificación"
        onChange={setCode}
      />
      <button
        className="auth-redesign-resend"
        type="button"
        disabled={secondsUntilResend > 0 || resending}
        onClick={() => void handleResend()}
      >
        {secondsUntilResend > 0
          ? `Reenviar en 00:${String(secondsUntilResend).padStart(2, "0")}`
          : resending
            ? "Reenviando..."
            : "¿No te llegó? Reenviar código"}
      </button>
      <PrimaryButton
        className="auth-redesign-form-button auth-redesign-form-button--recovery-code auth-redesign-button--green-text"
        disabled={submitting || code.length !== SUPABASE_EMAIL_OTP_LENGTH}
        onClick={() => void handleVerify()}
      >
        {submitting
          ? <LoadingState label="Verificando correo" variant="button" />
          : "Verificar correo"}
      </PrimaryButton>
      {error ? (
        <p
          className="auth-redesign-error auth-redesign-error--recovery-code"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </AuthScreenFrame>
  );
}

export function RecoveredPasswordFlow({ onCancelToLogin }: { onCancelToLogin: () => void }) {
  const {
    cancelPasswordRecovery,
    completePasswordRecovery,
    signOutOtherDevices,
    updateRecoveredPassword
  } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [step, setStep] = useState<"new-password" | "success">("new-password");
  const [submitting, setSubmitting] = useState(false);
  const [otherSessionsClosed, setOtherSessionsClosed] = useState(true);
  const [retryingSessions, setRetryingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const hasNoEdgeSpaces = newPassword === newPassword.trim();
  const passwordIsValid =
    newPassword.length >= 8 &&
    hasNoEdgeSpaces &&
    newPassword === confirmation;

  useEffect(() => {
    titleRef.current?.focus();
  }, [step]);

  async function handleUpdatePassword(): Promise<void> {
    if (!passwordIsValid) return;

    setSubmitting(true);
    setError(null);

    try {
      await updateRecoveredPassword(newPassword);

      try {
        await signOutOtherDevices();
        setOtherSessionsClosed(true);
      } catch {
        setOtherSessionsClosed(false);
      }

      setNewPassword("");
      setConfirmation("");
      setStep("success");
    } catch (updateError) {
      setError(getPasswordUpdateErrorMessage(updateError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(): Promise<void> {
    setSubmitting(true);
    setError(null);

    try {
      await cancelPasswordRecovery();
      setNewPassword("");
      setConfirmation("");
      onCancelToLogin();
    } catch {
      setError("No pudimos cancelar la recuperación. Intentá nuevamente.");
      setSubmitting(false);
    }
  }

  async function handleRetryOtherSessions(): Promise<void> {
    setRetryingSessions(true);

    try {
      await signOutOtherDevices();
      setOtherSessionsClosed(true);
    } catch {
      setOtherSessionsClosed(false);
    } finally {
      setRetryingSessions(false);
    }
  }

  if (step === "success") {
    return (
      <AuthShell>
        <AuthScreenFrame tone="green">
          <CharacterBackdrop src={signUpThreeUrl} top={470} />
          <BrandLogo variant="right-low" />
          <div className="auth-redesign-recovery-success">
            <CheckCircle aria-hidden="true" weight="regular" />
            <h1 ref={titleRef} tabIndex={-1}>Contraseña actualizada</h1>
            <p>
              {otherSessionsClosed
                ? "Tu cuenta está protegida y las demás sesiones fueron cerradas."
                : "La contraseña cambió, pero no pudimos cerrar las demás sesiones."}
            </p>
            {!otherSessionsClosed ? (
              <button type="button" disabled={retryingSessions} onClick={() => void handleRetryOtherSessions()}>
                {retryingSessions ? "Reintentando..." : "Reintentar cierre de sesiones"}
              </button>
            ) : null}
            <button className="is-primary" type="button" onClick={() => void completePasswordRecovery()}>
              Entrar a Kreis
            </button>
          </div>
        </AuthScreenFrame>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthScreenFrame tone="pumpkin">
        <CharacterBackdrop src={signUpFourUrl} top={430} />
        <BackButton variant="login" onClick={() => void handleCancel()} />
        <BrandLogo variant="right-low" />
        <h1 className="auth-redesign-title auth-redesign-title--recovered-password" ref={titleRef} tabIndex={-1}>
          CREÁ UNA NUEVA CONTRASEÑA
        </h1>
        <PasswordField
          className="auth-redesign-field--recovered-password"
          label="Nueva contraseña"
          value={newPassword}
          autoComplete="new-password"
          visible={showNewPassword}
          onChange={setNewPassword}
          onToggleVisibility={() => setShowNewPassword((current) => !current)}
        />
        <PasswordField
          className="auth-redesign-field--recovered-password-repeat"
          label="Repetir nueva contraseña"
          value={confirmation}
          autoComplete="new-password"
          visible={showConfirmation}
          onChange={setConfirmation}
          onToggleVisibility={() => setShowConfirmation((current) => !current)}
        />
        <ul className="auth-redesign-password-rules" aria-label="Requisitos de contraseña">
          <li className={cn(newPassword.length >= 8 && "is-valid")}>Mínimo 8 caracteres</li>
          <li className={cn(hasNoEdgeSpaces && newPassword.length > 0 && "is-valid")}>Sin espacios al inicio o al final</li>
          <li className={cn(confirmation.length > 0 && newPassword === confirmation && "is-valid")}>Ambas contraseñas coinciden</li>
        </ul>
        <PrimaryButton
          className="auth-redesign-form-button auth-redesign-form-button--recovered-password auth-redesign-button--pumpkin-text"
          disabled={submitting || !passwordIsValid}
          onClick={() => void handleUpdatePassword()}
        >
          {submitting ? <LoadingState label="Actualizando contraseña" variant="button" /> : "Actualizar contraseña"}
        </PrimaryButton>
        {error ? <p className="auth-redesign-error auth-redesign-error--recovered-password" role="alert">{error}</p> : null}
      </AuthScreenFrame>
    </AuthShell>
  );
}

export function AuthFlow({ initialStep = "welcome" }: { initialStep?: "welcome" | "login" }) {
  const { resendSignupCode, signIn, verifySignupCode } = useAuth();
  const [step, setStep] = useState<AuthStep>(initialStep);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [pendingSignupEmail, setPendingSignupEmail] = useState("");
  const [signupCodeContext, setSignupCodeContext] = useState<
    "registration-email-verification" | "pending-signup-confirmation"
  >("registration-email-verification");
  const [signupCodeInitialError, setSignupCodeInitialError] =
    useState<string | null>(null);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<SignupDraft>(emptySignupDraft);
  const [topics, setTopics] = useState<TopicCatalogItem[]>([]);
  const [topicsStatus, setTopicsStatus] = useState<CatalogStatus>("loading");
  const [catalogReloadKey, setCatalogReloadKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateFileName, setCertificateFileName] = useState<string | null>(null);
  const [certificateVerification, setCertificateVerification] =
    useState<CertificateVerification | null>(null);
  const [emailVerification, setEmailVerification] =
    useState<RegistrationEmailVerification | null>(null);

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
        const nextTopics = await listTopics(controller.signal);

        if (controller.signal.aborted) return;

        setTopics(nextTopics);
        setTopicsStatus("ready");
      } catch {
        if (!controller.signal.aborted) setTopicsStatus("error");
      }
    }

    void loadCatalogs();

    return () => controller.abort();
  }, [catalogReloadKey]);

  function updateDraft(updates: Partial<SignupDraft>): void {
    const emailChanged =
      "emailUser" in updates && updates.emailUser !== draft.emailUser;
    const universityChanged =
      "university" in updates && updates.university !== draft.university;
    const invalidatesCertificateVerification =
      emailChanged ||
      universityChanged ||
      ("legajo" in updates && updates.legajo !== draft.legajo) ||
      ("fullName" in updates && updates.fullName !== draft.fullName);

    if (emailChanged || universityChanged) {
      setEmailVerification(null);
      setPendingSignupEmail("");
    }
    if (invalidatesCertificateVerification) setCertificateVerification(null);
    setDraft((current) => ({ ...current, ...updates }));
  }

  function updateCertificateFile(file: File | null): void {
    setCertificateVerification(null);
    setCertificateFile(file);
    setCertificateFileName(file?.name ?? null);
    setSubmissionError(null);
  }

  async function handleProfileContinue(): Promise<void> {
    const email = getSignupEmail(draft);

    if (
      emailVerification &&
      Date.parse(emailVerification.expires_at) > Date.now()
    ) {
      setSubmissionError(null);
      setStep("password");
      return;
    }

    setSubmitting(true);
    setSubmissionError(null);

    try {
      const result = await startRegistrationEmailVerification(email, Number(draft.legajo));
      setEmailVerification(null);
      setPendingSignupEmail(result.email);
      setSignupCodeContext("registration-email-verification");
      setSignupCodeInitialError(null);
      setStep("signup-code");
    } catch (requestError) {
      setSubmissionError(getAuthErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegistrationEmailCode(
    code: string
  ): Promise<void> {
    const result = await verifyRegistrationEmail(
      pendingSignupEmail,
      code
    );

    setEmailVerification(result.verification);
    setSignupCodeInitialError(null);
    setSubmissionError(null);
    setStep("password");
  }

  async function resendRegistrationEmailCode(): Promise<void> {
    const result = await startRegistrationEmailVerification(
      pendingSignupEmail,
      Number(draft.legajo)
    );

    setEmailVerification(null);
    setPendingSignupEmail(result.email);
  }

  function handlePasswordContinue(): void {
    if (
      !emailVerification ||
      Date.parse(emailVerification.expires_at) <= Date.now()
    ) {
      setEmailVerification(null);
      setSignupCodeContext("registration-email-verification");
      setSignupCodeInitialError(
        "La verificación del correo venció. Volvé a verificar tu mail."
      );
      setStep("signup-code");
      return;
    }

    setSubmissionError(null);
    setStep("certificate");
  }

  async function handleSignup(certificateFile: File): Promise<void> {
    setSubmitting(true);
    setSubmissionError(null);

    try {
      const profile = getDraftProfile(draft);
      const email = getSignupEmail(draft);
      const emailToken = emailVerification;

      if (
        !emailToken ||
        Date.parse(emailToken.expires_at) <= Date.now()
      ) {
        setEmailVerification(null);
        setSignupCodeContext("registration-email-verification");
        setSignupCodeInitialError(
          "La verificación del correo venció. Volvé a verificar tu mail."
        );
        setStep("signup-code");
        return;
      }

      let verification = certificateVerification;

      if (!verification) {
        const classification = await classifyCertificate(certificateFile, {
          email,
          legajo: Number(draft.legajo),
          nombre: profile.nombre,
          apellido: profile.apellido,
          email_verification_token: emailToken.token
        });

        if (!classification.certificate.valid) {
          setSubmissionError(getInvalidCertificateMessage(classification.certificate));
          return;
        }

        if (!classification.verification) {
          setSubmissionError("No pudimos emitir la validación del certificado. Intentá nuevamente.");
          return;
        }

        verification = classification.verification;
        setCertificateVerification(verification);
      }

      if (Date.parse(verification.expires_at) <= Date.now()) {
        setCertificateVerification(null);
        setCertificateFile(null);
        setCertificateFileName(null);
        setSubmissionError("La validación del certificado venció. Volvé a cargarlo para continuar.");
        return;
      }


      const registration = await register({
        email,
        password: draft.password,
        legajo: Number(draft.legajo),
        nombre: profile.nombre,
        apellido: profile.apellido,
        topicos: draft.topicIds.map(Number),
        email_verification_token: emailToken.token,
        certificate_verification_token: verification.token
      });

      const password = draft.password;
      setCertificateVerification(null);
      setEmailVerification(null);
      setCertificateFile(null);
      setCertificateFileName(null);
      setDraft(emptySignupDraft);

      try {
        await signIn(registration.email, password);
      } catch {
        setPendingSignupEmail("");
        setLoginNotice("Cuenta creada. Ya podés iniciar sesión.");
        setStep("login");
      }
    } catch (requestError) {
      if (isEmailVerificationError(requestError)) {
        setEmailVerification(null);
        setSignupCodeContext("registration-email-verification");
        setSignupCodeInitialError(getAuthErrorMessage(requestError));
        setStep("signup-code");
        return;
      }

      if (isCertificateVerificationError(requestError)) {
        setCertificateVerification(null);
        setCertificateFile(null);
        setCertificateFileName(null);
        setStep("certificate");
      }

      setSubmissionError(getAuthErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      {step === "welcome" && <WelcomeScreen onBegin={() => setStep("events")} onLogin={() => {
        setLoginNotice(null);
        setStep("login");
      }} />}
      {step === "events" && <OnboardingEventsScreen onBack={() => setStep("welcome")} onContinue={() => setStep("communities")} />}
      {step === "communities" && <OnboardingCommunitiesScreen onBack={() => setStep("events")} onContinue={() => setStep("university")} />}
      {step === "university" && <UniversityScreen draft={draft} onBack={() => setStep("communities")} onChange={updateDraft} onContinue={() => setStep("interests")} />}
      {step === "interests" && <InterestsScreen draft={draft} topics={topics} status={topicsStatus} onBack={() => setStep("university")} onChange={updateDraft} onContinue={() => setStep("profile")} onRetry={() => setCatalogReloadKey((current) => current + 1)} />}
      {step === "profile" && (
        <ProfileScreen
          draft={draft}
          error={submissionError}
          submitting={submitting}
          onBack={() => setStep("interests")}
          onChange={updateDraft}
          onContinue={() => void handleProfileContinue()}
        />
      )}
      {step === "password" && (
        <PasswordScreen
          draft={draft}
          onBack={() => {
            setSubmissionError(null);
            setStep("profile");
          }}
          onChange={updateDraft}
          onContinue={handlePasswordContinue}
        />
      )}
      {step === "certificate" && (
        <CertificateScreen
          error={submissionError}
          fileName={certificateFileName}
          submitting={submitting}
          onBack={() => {
            setCertificateVerification(null);
            setStep("password");
          }}
          onFileSelect={updateCertificateFile}
          onSubmit={() => {
            if (certificateFile) void handleSignup(certificateFile);
          }}
        />
      )}
      {step === "login" && (
        <LoginScreen
          notice={loginNotice}
          onBack={() => setStep("welcome")}
          onForgotPassword={() => setStep("forgot-email")}
          onEmailConfirmationRequired={(email) => {
            setPendingSignupEmail(email);
            setSignupCodeContext("pending-signup-confirmation");
            setSignupCodeInitialError(null);
            setStep("signup-code");
          }}
        />
      )}
      {step === "signup-code" && (
        <SignupCodeScreen
          email={pendingSignupEmail}
          initialError={signupCodeInitialError}
          onBack={() => {
            setSignupCodeInitialError(null);

            if (signupCodeContext === "registration-email-verification") {
              setStep("profile");
              return;
            }

            setPendingSignupEmail("");
            setStep("login");
          }}
          onResend={
            signupCodeContext === "registration-email-verification"
              ? resendRegistrationEmailCode
              : () => resendSignupCode(pendingSignupEmail)
          }
          onVerify={
            signupCodeContext === "registration-email-verification"
              ? handleRegistrationEmailCode
              : (code) => verifySignupCode(pendingSignupEmail, code)
          }
        />
      )}
      {step === "forgot-email" && (
        <ForgotEmailScreen
          initialEmail={recoveryEmail}
          onBack={() => {
            setRecoveryEmail("");
            setStep("login");
          }}
          onCodeSent={(email) => {
            setRecoveryEmail(email);
            setStep("forgot-code");
          }}
        />
      )}
      {step === "forgot-code" && (
        <ForgotCodeScreen
          email={recoveryEmail}
          onBack={() => setStep("forgot-email")}
        />
      )}
    </AuthShell>
  );
}

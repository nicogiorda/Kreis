import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

export type AuthTone = "lace" | "green" | "orange" | "pumpkin";

export function AuthViewport({ children }: { children: ReactNode }) {
  return <div className="auth-stack-root">{children}</div>;
}

export function AuthShell({ children }: { children: ReactNode }) {
  return <div className="auth-redesign-shell">{children}</div>;
}

export function AuthScreenFrame({ children, tone }: { children: ReactNode; tone: AuthTone }) {
  return (
    <section className={cn("auth-redesign-screen", `auth-redesign-screen--${tone}`)}>
      <AuthStage>{children}</AuthStage>
    </section>
  );
}

export function AuthStage({ children }: { children: ReactNode }) {
  return <div className="auth-redesign-stage">{children}</div>;
}

export function AuthDecorLayer({ children }: { children: ReactNode }) {
  return <div className="auth-redesign-decor-layer" aria-hidden="true">{children}</div>;
}

export function AuthOrangeFill() {
  return (
    <AuthDecorLayer>
      <span className="auth-redesign-orange-fill" />
    </AuthDecorLayer>
  );
}

import { Flag, TrashBinTrash } from "@solar-icons/react";
import { CheckCircle, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { deletePost } from "../../api/posts";
import { createReport, type ReportTargetType } from "../../api/reports";
import { cn } from "../../utils/cn";

export type ReportTarget = {
  type: ReportTargetType;
  id: string;
};

type ReportContentSheetProps = {
  accessToken: string;
  target: ReportTarget | null;
  canDeletePost?: boolean;
  onPostDeleted?: (postId: string) => void | Promise<void>;
  onClose: () => void;
};

type SheetStep = "action" | "reasons" | "delete-confirm" | "success";

const reportReasons = [
  "Lenguaje agresivo o acoso",
  "Spam o contenido enganoso",
  "Contenido inapropiado",
  "Informacion personal",
  "Otro motivo"
] as const;

export function ReportContentSheet({
  accessToken,
  target,
  canDeletePost = false,
  onPostDeleted,
  onClose
}: ReportContentSheetProps) {
  const [step, setStep] = useState<SheetStep>("action");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [submittingReason, setSubmittingReason] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === "Escape" && !submittingReason && !deleting) onClose();
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [deleting, onClose, submittingReason, target]);

  if (!target) return null;

  const targetLabel = target.type === "Post" ? "publicacion" : "comentario";

  async function submitReport(): Promise<void> {
    if (!target || !selectedReason || submittingReason) return;

    setSubmittingReason(selectedReason);
    setError(null);

    try {
      const result = await createReport({
        targetType: target.type,
        targetId: target.id,
        reason: selectedReason
      }, accessToken);

      setDuplicate(result === "duplicate");
      setStep("success");
      navigator.vibrate?.(12);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No pudimos enviar el reporte. Intenta nuevamente."
      );
    } finally {
      setSubmittingReason(null);
    }
  }

  async function deleteCurrentPost(): Promise<void> {
    if (!target || target.type !== "Post" || !canDeletePost || deleting) return;

    setDeleting(true);
    setError(null);

    try {
      await deletePost(target.id, accessToken);
      await onPostDeleted?.(target.id);
      navigator.vibrate?.(16);
      onClose();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "No pudimos eliminar la publicacion. Intenta nuevamente."
      );
    } finally {
      setDeleting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submittingReason && !deleting) onClose();
      }}
    >
      <section
        className="w-full max-w-[430px] animate-[report-sheet-in_240ms_cubic-bezier(0.22,1,0.36,1)] rounded-t-[24px] bg-kreis-lace px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-3 text-kreis-ink shadow-[0_-12px_32px_rgba(34,49,40,0.16)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-sheet-title"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-kreis-line" aria-hidden="true" />

        {step === "action" ? (
          <>
            <div className="flex items-center justify-between">
              <h2 id="report-sheet-title" className="m-0 text-[18px] font-medium">
                Opciones
              </h2>
              <button
                className="grid size-11 place-items-center rounded-full border-0 bg-transparent p-0 text-kreis-muted shadow-none transition-transform duration-150 active:scale-95"
                type="button"
                aria-label="Cerrar"
                onClick={onClose}
              >
                <X aria-hidden="true" size={21} weight="bold" />
              </button>
            </div>
            {canDeletePost && target.type === "Post" ? (
              <button
                className="mt-2 flex min-h-[54px] w-full items-center gap-3 rounded-[8px] border-0 bg-kreis-event-surface px-4 text-left text-[15px] font-medium text-kreis-orange shadow-none transition-transform duration-150 active:scale-[0.98]"
                type="button"
                onClick={() => setStep("delete-confirm")}
              >
                <TrashBinTrash aria-hidden="true" size={22} weight="LineDuotone" />
                Eliminar publicacion
              </button>
            ) : (
              <button
                className="mt-2 flex min-h-[54px] w-full items-center gap-3 rounded-[8px] border-0 bg-kreis-event-surface px-4 text-left text-[15px] font-medium text-kreis-orange shadow-none transition-transform duration-150 active:scale-[0.98]"
                type="button"
                onClick={() => setStep("reasons")}
              >
                <Flag aria-hidden="true" size={22} weight="LineDuotone" />
                Reportar {targetLabel}
              </button>
            )}
          </>
        ) : null}

        {step === "delete-confirm" ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="report-sheet-title" className="m-0 text-[18px] font-medium">
                  Eliminar publicacion
                </h2>
                <p className="mb-0 mt-1 text-[13px] leading-[1.4] text-kreis-muted">
                  Tambien se eliminaran sus comentarios. Esta accion no se puede deshacer.
                </p>
              </div>
              <button
                className="grid size-11 flex-none place-items-center rounded-full border-0 bg-transparent p-0 text-kreis-muted shadow-none transition-transform duration-150 active:scale-95"
                type="button"
                aria-label="Cerrar"
                disabled={deleting}
                onClick={onClose}
              >
                <X aria-hidden="true" size={21} weight="bold" />
              </button>
            </div>

            {error ? (
              <p className="mb-0 mt-4 text-[13px] font-medium leading-[1.35] text-kreis-orange" role="alert">
                {error}
              </p>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                className="min-h-[50px] rounded-[8px] border-0 bg-kreis-event-surface px-4 text-[15px] font-medium text-kreis-ink shadow-none transition-transform duration-150 active:scale-[0.98]"
                type="button"
                disabled={deleting}
                onClick={() => setStep("action")}
              >
                Cancelar
              </button>
              <button
                className="min-h-[50px] rounded-[8px] border-0 bg-kreis-orange px-4 text-[15px] font-medium text-kreis-cream shadow-none transition-[opacity,transform] duration-150 enabled:active:scale-[0.98] disabled:opacity-60"
                type="button"
                disabled={deleting}
                onClick={() => void deleteCurrentPost()}
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </>
        ) : null}

        {step === "reasons" ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="report-sheet-title" className="m-0 text-[18px] font-medium">
                  Reportar {targetLabel}
                </h2>
                <p className="mb-0 mt-1 text-[13px] leading-[1.35] text-kreis-muted">
                  El reporte es confidencial. Elegi el motivo que mejor describa lo ocurrido.
                </p>
              </div>
              <button
                className="grid size-11 flex-none place-items-center rounded-full border-0 bg-transparent p-0 text-kreis-muted shadow-none transition-transform duration-150 active:scale-95"
                type="button"
                aria-label="Cerrar"
                disabled={Boolean(submittingReason)}
                onClick={onClose}
              >
                <X aria-hidden="true" size={21} weight="bold" />
              </button>
            </div>

            <div className="mt-4 grid overflow-hidden rounded-[8px] bg-kreis-event-surface">
              {reportReasons.map((reason, index) => (
                <button
                  className={cn(
                    "flex min-h-[52px] w-full items-center justify-between border-0 bg-transparent px-4 text-left text-[14px] font-normal text-kreis-ink shadow-none transition-colors duration-150 active:bg-kreis-beige",
                    index > 0 && "border-t border-kreis-line"
                  )}
                  type="button"
                  key={reason}
                  disabled={Boolean(submittingReason)}
                  aria-pressed={selectedReason === reason}
                  onClick={() => {
                    setSelectedReason(reason);
                    setError(null);
                    navigator.vibrate?.(8);
                  }}
                >
                  <span>{reason}</span>
                  <span
                    className={cn(
                      "grid size-[18px] flex-none place-items-center rounded-full border border-kreis-muted",
                      selectedReason === reason && "border-kreis-orange"
                    )}
                    aria-hidden="true"
                  >
                    <span
                      className={cn(
                        "size-2.5 rounded-full bg-kreis-orange transition-transform duration-150",
                        selectedReason === reason ? "scale-100" : "scale-0"
                      )}
                    />
                  </span>
                </button>
              ))}
            </div>

            {error ? (
              <p className="mb-0 mt-3 text-[13px] font-medium leading-[1.35] text-kreis-orange" role="alert">
                {error}
              </p>
            ) : null}

            <button
              className="mt-4 min-h-[50px] w-full rounded-[8px] border-0 bg-kreis-orange px-4 text-[15px] font-medium text-kreis-cream shadow-none transition-[opacity,transform] duration-150 enabled:active:scale-[0.98] disabled:opacity-40"
              type="button"
              disabled={!selectedReason || Boolean(submittingReason)}
              onClick={() => void submitReport()}
            >
              {submittingReason ? "Enviando..." : "Confirmar reporte"}
            </button>
          </>
        ) : null}

        {step === "success" ? (
          <div className="pb-2 pt-1 text-center">
            <CheckCircle className="mx-auto text-kreis-green" aria-hidden="true" size={42} weight="fill" />
            <h2 id="report-sheet-title" className="mb-0 mt-3 text-[18px] font-medium">
              {duplicate ? "Reporte ya enviado" : "Reporte enviado"}
            </h2>
            <p className="mx-auto mb-0 mt-1 max-w-[300px] text-[13px] leading-[1.4] text-kreis-muted">
              {duplicate
                ? `Ya habias reportado este ${targetLabel}.`
                : "Gracias. El equipo de moderacion va a revisarlo."}
            </p>
            <button
              className="mt-5 min-h-[48px] w-full rounded-[8px] border-0 bg-kreis-green px-4 text-[15px] font-medium text-kreis-cream shadow-none transition-transform duration-150 active:scale-[0.98]"
              type="button"
              onClick={onClose}
            >
              Listo
            </button>
          </div>
        ) : null}
      </section>
    </div>,
    document.body
  );
}

import React from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmModal({
  isOpen,
  message,
  onConfirm,
  onCancel,
  confirmText = "Eliminar",
  cancelText = "Cancelar",
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <section
        className="record-dialog confirm-dialog"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: 400, textAlign: "center", padding: "32px 24px" }}
      >
        <h3 style={{ margin: "0 0 24px 0", fontSize: 18 }}>{message}</h3>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button className="button button--quiet" onClick={onCancel} style={{ flex: 1 }}>
            {cancelText}
          </button>
          <button
            className="button"
            style={{ flex: 1, backgroundColor: "var(--danger, #a34f3d)", color: "#fff" }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </section>
    </div>
  );
}

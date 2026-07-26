import { useRegisterSW } from "virtual:pwa-register/react";

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("SW registered:", r);
    },
    onRegisterError(error) {
      console.log("SW registration error:", error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
        padding: "12px 20px",
        display: "flex",
        gap: 12,
        alignItems: "center",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <span style={{ fontSize: "var(--fs-sm)" }}>Update available</span>
      <button className="btn btn--primary btn--sm" onClick={() => updateServiceWorker(true)}>
        Update
      </button>
      <button className="btn btn--ghost btn--sm" onClick={() => setNeedRefresh(false)}>
        Dismiss
      </button>
    </div>
  );
}

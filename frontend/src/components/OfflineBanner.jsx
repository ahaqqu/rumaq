import { useTranslation } from "react-i18next";
import { useOnlineStatus } from "../lib/useOnlineStatus.js";
import { IconOffline } from "./icons.jsx";

export function OfflineBanner() {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--sp-2)",
        padding: "var(--sp-2) var(--sp-4)",
        background: "var(--surface-raised)",
        borderBottom: "1px solid var(--border)",
        color: "var(--text-faint)",
        fontSize: "var(--fs-sm)",
      }}
    >
      <IconOffline size={16} />
      {t("offline.banner")}
    </div>
  );
}

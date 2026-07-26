import { useState, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { LocChip, TimeSignal, EmptyState, SkeletonRows } from "../components/ui.jsx";
import { useStock, useUpdateStock, useLocations } from "../lib/queries/index.js";
import { usePersona } from "../context/PersonaContext.jsx";
import { personaText } from "../lib/persona.js";
import { IconSearch, IconBox, IconPlus, IconMinus } from "../components/icons.jsx";

function getDaysUntil(expiryDate) {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate + "T00:00:00");
  return Math.round((expiry - now) / 86400000);
}

export function Inventory() {
  const { t } = useTranslation();
  const { persona } = usePersona();
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("all");
  const searchTimer = useRef(null);
  const [debouncedQ, setDebouncedQ] = useState("");

  const { data: stockData, isLoading } = useStock({
    location: loc === "all" ? undefined : loc,
    q: debouncedQ || undefined,
  });
  const { data: locationsData } = useLocations();
  const updateStock = useUpdateStock();

  const rows = stockData?.stock ?? [];
  const locations = useMemo(() => locationsData?.locations ?? [], [locationsData]);

  const handleSearch = useCallback((value) => {
    setQ(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedQ(value);
    }, 300);
  }, []);

  const handleQtyUpdate = useCallback(
    (id, delta) => {
      const item = rows.find((r) => r.id === id);
      if (!item) return;
      const newQty = Math.max(0, item.qty + delta);
      updateStock.mutate({ id, payload: { qty: newQty } });
    },
    [rows, updateStock],
  );

  return (
    <>
      <div className="page__head">
        <p className="page__lead">{personaText("inventoryLead", persona, t)}</p>
      </div>

      <div
        style={{
          display: "flex",
          gap: "var(--sp-3)",
          flexWrap: "wrap",
          marginBottom: "var(--sp-4)",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <IconSearch
            size={18}
            style={{
              position: "absolute",
              left: 12,
              top: 12,
              color: "var(--text-faint)",
            }}
          />
          <input
            value={q}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t("inventory.searchPlaceholder")}
            aria-label={t("inventory.searchAriaLabel")}
            style={{ paddingLeft: 40 }}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "var(--sp-2)",
          flexWrap: "wrap",
          marginBottom: "var(--sp-5)",
        }}
      >
        <button
          className="chip chip--filter"
          aria-pressed={loc === "all"}
          onClick={() => setLoc("all")}
        >
          {t("inventory.all")}
        </button>
        {locations.map((locItem) => (
          <button
            key={locItem.id}
            className="chip chip--filter"
            aria-pressed={loc === locItem.id}
            onClick={() => setLoc(locItem.id)}
          >
            {locItem.label}
          </button>
        ))}
      </div>

      <div className="panel">
        {isLoading ? (
          <SkeletonRows n={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={IconBox}
            title={t("inventory.noMatch")}
            desc={t("inventory.noMatchDesc")}
          />
        ) : (
          <div className="list">
            {rows.map((s) => (
              <div className="row" key={s.id}>
                <div className="row__main">
                  <div className="row__name">
                    {s.name} <LocChip loc={s.location} />
                  </div>
                  <div className="row__meta">
                    <TimeSignal
                      expiryDays={getDaysUntil(s.expiry_date)}
                      runOut={s.run_out_days}
                      basis={s.basis}
                    />
                  </div>
                </div>
                <div className="row__side">
                  <div className="row__qty row__qty--editable">
                    <button
                      className="btn btn--icon btn--sm"
                      onClick={() => handleQtyUpdate(s.id, -1)}
                      disabled={s.qty <= 0}
                      aria-label={t("inventory.decreaseQty")}
                    >
                      <IconMinus size={14} />
                    </button>
                    <span className="row__qty-value">
                      {s.qty} {s.unit}
                    </span>
                    <button
                      className="btn btn--icon btn--sm"
                      onClick={() => handleQtyUpdate(s.id, 1)}
                      aria-label={t("inventory.increaseQty")}
                    >
                      <IconPlus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

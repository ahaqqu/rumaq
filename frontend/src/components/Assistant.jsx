import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  IconSpark,
  IconClose,
  IconPlan,
  IconShop,
  IconLeaf,
  IconBolt,
  IconCheck,
  IconKey,
} from "./icons.jsx";
import { usePersona } from "../context/PersonaContext.jsx";
import { useApp } from "../context/AppContext.jsx";
import { personaText } from "../lib/persona.js";
import { useUsage, useSendChatMessage, useSettings } from "../lib/queries/index.js";

const QUICK = [
  {
    id: "plan",
    key: "planThisWeek",
    descKey: "planThisWeekDesc",
    Icon: IconPlan,
    prompt: "Create this week's shopping plan from items running low and my purchase history.",
  },
  {
    id: "store",
    key: "cheapestStore",
    descKey: "cheapestStoreDesc",
    Icon: IconShop,
    prompt: "Recommend the cheapest store for my usual items, based on price history.",
  },
  {
    id: "useup",
    key: "useUpExpiring",
    descKey: "useUpExpiringDesc",
    Icon: IconLeaf,
    prompt: "Suggest recipes to use up items that are expiring soon.",
  },
];

function classifyError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (/usage limit/i.test(msg)) return { kind: "usage", message: msg };
  if (/not configured|api key/i.test(msg)) return { kind: "missing", message: msg };
  return { kind: "other", message: msg };
}

export function Assistant({ open, onOpen, onClose, aiKey, onNavigate }) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [reply, setReply] = useState(null);
  const { persona } = usePersona();
  const { setAssistantProposal } = useApp();
  const { data: usage } = useUsage();
  const { data: settings } = useSettings();
  const chat = useSendChatMessage();

  const hasBackendKey = settings?.has_ai_key === true;
  const isConnected = Boolean(aiKey) || hasBackendKey;

  const used = usage?.used ?? 0;
  const limit = usage?.daily_limit ?? 20;
  const warn = used >= limit - 4;
  const danger = used >= limit;

  const send = async (text) => {
    if (!text.trim() || chat.isPending) return;
    setReply(null);
    try {
      const result = await chat.mutateAsync({
        message: text.trim(),
        history: [],
      });
      setReply(result?.reply || "");
    } catch (err) {
      setReply({ error: classifyError(err) });
    }
  };

  const trigger = (q) => {
    if (!isConnected) return;
    send(q.prompt);
  };

  const accept = () => {
    onClose();
    if (typeof reply === "string" && reply.trim()) {
      setAssistantProposal(reply.slice(0, 4000));
    }
    setReply(null);
    onNavigate?.("plan");
  };

  const errorState = reply && typeof reply === "object" && reply.error ? reply.error : null;

  return (
    <>
      <button
        className="fab"
        onClick={() => (open ? onClose() : onOpen())}
        aria-label={t("assistant.fabAriaLabel")}
        aria-expanded={open}
      >
        <span className="fab__pulse" />
        <IconSpark size={20} />
        <span>{t("assistant.fabLabel")}</span>
      </button>

      {open && (
        <>
          <div className="scrim" onClick={onClose} />
          <section className="assistant" role="dialog" aria-label={t("assistant.dialogAriaLabel")}>
            <header className="assistant__head">
              <div className="assistant__avatar">
                <IconSpark size={18} />
              </div>
              <div>
                <div className="assistant__title">{t("assistant.title")}</div>
                <div className="assistant__status">
                  {isConnected ? (
                    <>
                      <span className={`rail__dot ${danger ? "is-off" : warn ? "is-warn" : ""}`} />
                      {danger
                        ? t("assistant.dailyLimitReached")
                        : t("assistant.ready", { used, limit })}
                    </>
                  ) : (
                    t("assistant.notConnected")
                  )}
                </div>
              </div>
              <button
                className="assistant__close"
                onClick={onClose}
                aria-label={t("assistant.closeAriaLabel")}
              >
                <IconClose size={18} />
              </button>
            </header>

            {!isConnected ? (
              <div className="assistant__keystate">
                <div className="empty__icon" style={{ margin: "0 auto var(--sp-4)" }}>
                  <IconKey size={40} />
                </div>
                <div className="empty__title">{t("assistant.connectKeyFirst")}</div>
                <div className="empty__desc">{t("assistant.bringYourOwnKey")}</div>
                <button
                  className="btn btn--primary btn--block"
                  style={{ marginTop: "var(--sp-5)" }}
                  onClick={() => {
                    onClose();
                    onNavigate("settings");
                  }}
                >
                  <IconKey size={18} /> {t("assistant.addApiKey")}
                </button>
              </div>
            ) : (
              <div className="assistant__body">
                <p className="assistant__msg">
                  {personaText("assistantGreeting", persona, t)}{" "}
                  {personaText("assistantQuestion", persona, t)}
                </p>

                <div className="assistant__actions">
                  {QUICK.map(({ id, key, descKey, Icon, prompt }) => (
                    <button
                      key={id}
                      className="assistant__action"
                      onClick={() => trigger({ prompt })}
                      disabled={chat.isPending}
                    >
                      <Icon size={18} />
                      <span>
                        <div>{t(`assistant.${key}`)}</div>
                        <div
                          className="why"
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "var(--fs-xs)",
                          }}
                        >
                          {t(`assistant.${descKey}`)}
                        </div>
                      </span>
                    </button>
                  ))}
                </div>

                {chat.isPending && (
                  <div
                    className="assistant__msg"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--sp-3)",
                    }}
                  >
                    <IconBolt size={16} className="spin" style={{ color: "var(--accent)" }} />
                    {t("assistant.analyzing")}
                  </div>
                )}

                {errorState && (
                  <div
                    className="assistant__msg"
                    style={{
                      color:
                        errorState.kind === "usage"
                          ? "var(--text-muted)"
                          : "var(--text-danger, currentColor)",
                      fontSize: "var(--fs-sm)",
                    }}
                  >
                    {errorState.kind === "usage"
                      ? t("assistant.usageLimit")
                      : errorState.kind === "missing"
                        ? t("assistant.keyMissing")
                        : t("assistant.error", { message: errorState.message })}
                    {(errorState.kind === "usage" || errorState.kind === "missing") && (
                      <div style={{ marginTop: "var(--sp-2)" }}>
                        <button
                          className="btn btn--secondary btn--sm"
                          onClick={() => {
                            onClose();
                            onNavigate("settings");
                          }}
                        >
                          {t("assistant.addApiKey")}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {reply && typeof reply === "string" && (
                  <div className="assistant__proposal">
                    <p style={{ whiteSpace: "pre-wrap" }}>{reply}</p>
                    <div
                      style={{
                        display: "flex",
                        gap: "var(--sp-2)",
                        marginTop: "var(--sp-4)",
                      }}
                    >
                      <button className="btn btn--primary btn--sm btn--block" onClick={accept}>
                        <IconCheck size={16} /> {t("assistant.applyToPlan")}
                      </button>
                      <button className="btn btn--secondary btn--sm" onClick={() => setReply(null)}>
                        {t("assistant.change")}
                      </button>
                    </div>
                  </div>
                )}

                <form
                  style={{
                    marginTop: "var(--sp-4)",
                    display: "flex",
                    gap: "var(--sp-2)",
                  }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    send(input);
                    setInput("");
                  }}
                >
                  <input
                    className="input"
                    type="text"
                    placeholder={t("assistant.inputPlaceholder")}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    aria-label={t("assistant.inputPlaceholder")}
                  />
                  <button
                    type="submit"
                    className="btn btn--primary btn--sm"
                    disabled={chat.isPending || !input.trim()}
                    aria-label={t("assistant.sendAriaLabel")}
                  >
                    {t("assistant.send")}
                  </button>
                </form>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

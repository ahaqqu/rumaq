import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "../context/AppContext.jsx";
import { History } from "../pages/History.jsx";

function RouteComponent() {
  const { setAssistantOpen } = useApp();

  return <History askAssistant={() => setAssistantOpen(true)} />;
}

export const Route = createFileRoute("/history")({
  component: RouteComponent,
});

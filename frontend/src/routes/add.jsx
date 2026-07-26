import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AddFromReceipt } from "../pages/AddFromReceipt.jsx";

function RouteComponent() {
  const navigate = useNavigate();

  return <AddFromReceipt onDone={() => navigate({ to: "/inventory" })} />;
}

export const Route = createFileRoute("/add")({
  component: RouteComponent,
});

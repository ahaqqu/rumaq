import { Outlet, createRootRoute } from "@tanstack/react-router";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { PersonaProvider } from "../context/PersonaContext.jsx";
import { AppProvider } from "../context/AppContext.jsx";
import { AppShell } from "../components/AppShell.jsx";
import { Login } from "../pages/Login.jsx";
import { PwaUpdatePrompt } from "../components/PwaUpdatePrompt.jsx";
import { queryClient, persistOptions } from "../lib/queryClient.js";
import { useMe } from "../lib/queries/me.js";
import { useSettings } from "../lib/queries/settings.js";

function AuthGate() {
  const { data: me, isLoading } = useMe();
  const { data: settings } = useSettings();

  if (isLoading) return null;

  if (!me) {
    return (
      <PersonaProvider>
        <Login />
      </PersonaProvider>
    );
  }

  const initialPersona = settings
    ? {
        userRole: settings.persona_user_role || "",
        aiRole: settings.persona_ai_role || "",
        enabled: settings.persona_enabled,
      }
    : undefined;

  return (
    <PersonaProvider initialPersona={initialPersona}>
      <AppShell>
        <Outlet />
      </AppShell>
    </PersonaProvider>
  );
}

function RootComponent() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      onSuccess={() => queryClient.resumePausedMutations()}
    >
      <AppProvider>
        <AuthGate />
      </AppProvider>
      <ReactQueryDevtools initialIsOpen={false} />
      <PwaUpdatePrompt />
    </PersistQueryClientProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});

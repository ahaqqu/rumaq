import { Outlet, createRootRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { PersonaProvider } from '../context/PersonaContext.jsx'
import { AppProvider } from '../context/AppContext.jsx'
import { AppShell } from '../components/AppShell.jsx'
import { Login } from '../pages/Login.jsx'
import { PwaUpdatePrompt } from '../components/PwaUpdatePrompt.jsx'
import { useMe } from '../lib/queries/me.js'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
})

function AuthGate({ children }) {
  const { data: me, isLoading } = useMe()

  if (isLoading) return null

  if (!me) {
    return (
      <PersonaProvider>
        <Login />
      </PersonaProvider>
    )
  }

  return children
}

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <AuthGate>
          <PersonaProvider>
            <AppShell>
              <Outlet />
            </AppShell>
          </PersonaProvider>
        </AuthGate>
      </AppProvider>
      <ReactQueryDevtools initialIsOpen={false} />
      <PwaUpdatePrompt />
    </QueryClientProvider>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})

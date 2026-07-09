import { useState, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import { Shell } from '@/components/layout/Shell';
import { Dashboard } from '@/pages/Dashboard';
import { Employees } from '@/pages/Employees';
import { EmployeeDetail } from '@/pages/EmployeeDetail';
import { TimeEntry } from '@/pages/TimeEntry';
import { Reports } from '@/pages/Reports';
import { Login } from '@/pages/Login';

function Router({ onLogout }: { onLogout: () => void }) {
  return (
    <Shell onLogout={onLogout}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/mitarbeiter" component={Employees} />
        <Route path="/mitarbeiter/:id" component={EmployeeDetail} />
        <Route path="/zeiterfassung" component={TimeEntry} />
        <Route path="/berichte" component={Reports} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  // queryClientRef must be declared before any function that references it.
  const queryClientRef = useRef<QueryClient | null>(null);

  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: {
        queries: {
          // On 401, immediately mark the user as unauthenticated.
          // This handles stale sessions (e.g. after a server restart loses MemoryStore).
          retry: (failureCount, error: any) => {
            if (error?.status === 401) return false;
            return failureCount < 2;
          },
        },
      },
    });
  }
  const queryClient = queryClientRef.current;

  const goUnauthenticated = () => {
    queryClient.clear();
    setAuthState('unauthenticated');
  };

  // Wire up global 401 detection via query cache observer.
  // We use onError at the QueryClient level to also catch mutations.
  useEffect(() => {
    const client = queryClient;
    const unsubscribe = client.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.state.error) {
        const err = event.query.state.error as any;
        if (err?.status === 401) goUnauthenticated();
      }
    });
    const mutUnsubscribe = client.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.mutation?.state.error) {
        const err = event.mutation.state.error as any;
        if (err?.status === 401) goUnauthenticated();
      }
    });
    return () => { unsubscribe(); mutUnsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Cache-Control: no-store is set server-side so this always reflects reality.
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setAuthState(data.authenticated ? 'authenticated' : 'unauthenticated'))
      .catch(() => setAuthState('unauthenticated'));
  }, []);

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      .finally(() => {
        queryClient.clear();
        setAuthState('unauthenticated');
      });
  };

  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Login onLogin={() => setAuthState('authenticated')} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router onLogout={handleLogout} />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

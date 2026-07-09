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

const queryClient = new QueryClient();

function Router() {
  return (
    <Shell>
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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

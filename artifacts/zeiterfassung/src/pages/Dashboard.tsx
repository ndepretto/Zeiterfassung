import { useGetDashboardSummary } from "@workspace/api-client-react";
import { formatMinutes } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export function Dashboard() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12
  
  const { data: summary, isLoading } = useGetDashboardSummary({
    year,
    month
  }, { query: { queryKey: ["dashboard", year, month] } });

  if (isLoading || !summary) {
    return (
      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Übersicht für {monthNames[month - 1]} {year}
        </p>
      </div>

      {summary.employees.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground font-medium mb-1">Keine Mitarbeiter gefunden</p>
            <p className="text-sm text-muted-foreground">Fügen Sie Mitarbeiter hinzu, um Daten zu sehen.</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {summary.employees.map((emp) => {
            // Month calculations
            const monthDiff = emp.monthMinutes - emp.monthTargetMinutes;
            const monthStatus = monthDiff >= 0 ? "Überstunden" : "Fehlstunden";
            const monthColor = monthDiff >= 0 ? "text-emerald-600" : "text-rose-600";
            
            // Year progress
            const yearProgress = emp.yearTargetMinutes > 0 ? Math.min(100, Math.round((emp.yearMinutes / emp.yearTargetMinutes) * 100)) : 0;
            
            return (
              <Card key={emp.employeeId} className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{emp.firstName} {emp.lastName}</CardTitle>
                      <CardDescription>Pensum: {emp.pensum}%</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Monthly stats */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Aktueller Monat</h4>
                    <div className="flex items-end justify-between">
                      <div className="flex flex-col">
                        <span className="text-2xl font-semibold">{formatMinutes(emp.monthMinutes)}</span>
                        <span className="text-xs text-muted-foreground">geleistet von {formatMinutes(emp.monthTargetMinutes)} Soll</span>
                      </div>
                      <div className={`text-sm font-medium flex flex-col items-end ${monthColor}`}>
                        <span>{monthDiff > 0 ? "+" : ""}{formatMinutes(monthDiff)}</span>
                        <span className="text-[10px] uppercase">{monthStatus}</span>
                      </div>
                    </div>
                  </div>

                  {/* Year to date stats */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <h4 className="font-medium text-muted-foreground uppercase tracking-wider">Jahresfortschritt</h4>
                      <span className="font-medium">{yearProgress}%</span>
                    </div>
                    <Progress value={yearProgress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{formatMinutes(emp.yearMinutes)} h</span>
                      <span>{formatMinutes(emp.yearTargetMinutes)} h (Soll)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

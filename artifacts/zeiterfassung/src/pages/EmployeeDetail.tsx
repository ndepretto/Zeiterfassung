import { useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getYear, getMonth, isSameDay, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { 
  useGetEmployee, 
  useGetEmployeeReport,
  getGetEmployeeQueryKey,
  getGetEmployeeReportQueryKey
} from "@workspace/api-client-react";
import { formatMinutes, formatTimeInterval } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, ArrowLeft, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const employeeId = parseInt(id || "0", 10);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = getYear(currentDate);
  const month = getMonth(currentDate) + 1;

  const { data: employee, isLoading: isEmployeeLoading } = useGetEmployee(employeeId, {
    query: { queryKey: getGetEmployeeQueryKey(employeeId), enabled: !!employeeId }
  });

  const { data: report, isLoading: isReportLoading } = useGetEmployeeReport({
    employeeId,
    year,
    month
  }, {
    query: { queryKey: getGetEmployeeReportQueryKey({ employeeId, year, month }), enabled: !!employeeId }
  });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const monthLabel = format(currentDate, "MMMM yyyy", { locale: de });

  // Generate calendar days
  const calendarDays = useMemo(() => {
    if (!report) return [];
    
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start, end });
    
    return daysInMonth.map(date => {
      const dateStr = format(date, "yyyy-MM-dd");
      const reportDay = report.days.find(d => d.date === dateStr);
      return {
        date,
        dateStr,
        dayName: format(date, "EEEE", { locale: de }),
        dayNum: format(date, "dd"),
        data: reportDay || null,
        isWeekend: date.getDay() === 0 || date.getDay() === 6
      };
    });
  }, [currentDate, report]);

  if (isEmployeeLoading) {
    return (
      <div className="p-8 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">Mitarbeiter nicht gefunden</h1>
        <Link href="/mitarbeiter" className="text-primary hover:underline mt-4 inline-block">
          Zurück zur Liste
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <Link href="/mitarbeiter" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zu Mitarbeitern
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{employee.firstName} {employee.lastName}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Pensum: {employee.pensum}% • Jahressoll: {employee.annualHours}h
              {employee.email && ` • ${employee.email}`}
            </p>
          </div>
          <Link href="/zeiterfassung">
            <Button className="gap-2">
              <Clock className="h-4 w-4" />
              Zeit erfassen
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-muted shadow-sm">
          <CardHeader className="pb-3 bg-muted/30">
            <CardTitle className="text-base flex items-center justify-between">
              Monatsübersicht
              <div className="flex gap-1 bg-background rounded-md border p-0.5">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-xs font-medium px-2 flex items-center min-w-[100px] justify-center">
                  {monthLabel}
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {isReportLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : report ? (
              <>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Geleistet (Monat)</span>
                    <span className="font-medium">{formatMinutes(report.totalMinutes)} h</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Soll (Monat)</span>
                    <span className="font-medium">{formatMinutes(report.targetMinutes)} h</span>
                  </div>
                  <div className="pt-2 mt-2 border-t flex justify-between">
                    <span className="font-medium text-sm">Saldo</span>
                    <span className={`font-bold ${report.differenceMinutes >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {report.differenceMinutes > 0 ? "+" : ""}{formatMinutes(report.differenceMinutes)} h
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Jahresfortschritt</span>
                    <span className="font-medium">
                      {report.yearTargetMinutes > 0 ? Math.round((report.yearTotalMinutes / report.yearTargetMinutes) * 100) : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={report.yearTargetMinutes > 0 ? (report.yearTotalMinutes / report.yearTargetMinutes) * 100 : 0} 
                    className="h-2" 
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatMinutes(report.yearTotalMinutes)} h</span>
                    <span>{formatMinutes(report.yearTargetMinutes)} h</span>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Tägliche Erfassung</CardTitle>
            <CardDescription>Zeiteinträge für {monthLabel}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isReportLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="divide-y border-y">
                {calendarDays.map((day) => (
                  <div 
                    key={day.dateStr} 
                    className={`flex flex-col sm:flex-row sm:items-center p-3 text-sm transition-colors hover:bg-muted/30 ${
                      day.isWeekend ? 'bg-muted/10' : ''
                    } ${isSameDay(day.date, new Date()) ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                  >
                    <div className={`w-32 flex-shrink-0 font-medium ${day.isWeekend ? 'text-muted-foreground' : ''}`}>
                      <span className="inline-block w-8 text-right mr-2">{day.dayNum}.</span>
                      {day.dayName}
                    </div>
                    
                    <div className="flex-1 mt-1 sm:mt-0 flex flex-wrap gap-2 items-center">
                      {day.data?.intervals.length ? (
                        day.data.intervals.map((interval, i) => (
                          <span key={i} className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground border border-secondary-border shadow-sm">
                            {interval.comeTime} — {interval.goTime}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground/50 italic text-xs">-</span>
                      )}
                      
                      {day.data?.note && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px] ml-2" title={day.data.note}>
                          ({day.data.note})
                        </span>
                      )}
                    </div>
                    
                    <div className="w-20 text-right font-medium mt-1 sm:mt-0 ml-auto tabular-nums">
                      {day.data?.totalMinutes ? formatMinutes(day.data.totalMinutes) : "-"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

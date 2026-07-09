import { useState } from "react";
import { useGetMonthlyReport, getGetMonthlyReportQueryKey } from "@workspace/api-client-react";
import { formatMinutes } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Reports() {
  const currentDate = new Date();
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [month, setMonth] = useState<number>(currentDate.getMonth() + 1);

  const { data: report, isLoading } = useGetMonthlyReport({
    year,
    month
  }, { query: { queryKey: getGetMonthlyReportQueryKey({ year, month }) } });

  const years = [currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1];
  const months = [
    { value: 1, label: "Januar" },
    { value: 2, label: "Februar" },
    { value: 3, label: "März" },
    { value: 4, label: "April" },
    { value: 5, label: "Mai" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Dezember" }
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Berichte</h1>
          <p className="text-muted-foreground text-sm">
            Monatsauswertungen und Stundensalden für alle Mitarbeiter.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={month.toString()} onValueChange={(val) => setMonth(parseInt(val))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Monat" />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={year.toString()} onValueChange={(val) => setYear(parseInt(val))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Jahr" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" className="gap-2" disabled={isLoading || !report || report.employees.length === 0}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportieren</span>
          </Button>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !report || report.employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-muted p-4 rounded-full mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground mb-1">Keine Daten für diesen Monat</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Für {months.find(m => m.value === month)?.label} {year} liegen keine Zeiteinträge vor.
            </p>
          </div>
        ) : (
          <div className="rounded-md border-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[250px] font-semibold">Mitarbeiter</TableHead>
                  <TableHead className="text-right">Pensum</TableHead>
                  <TableHead className="text-right">Geleistet (Monat)</TableHead>
                  <TableHead className="text-right">Soll (Monat)</TableHead>
                  <TableHead className="text-right font-semibold">Monatssaldo</TableHead>
                  <TableHead className="text-right border-l pl-4">Geleistet (Jahr)</TableHead>
                  <TableHead className="text-right">Soll (Jahr)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.employees.map((emp) => {
                  const monthDiff = emp.differenceMinutes || (emp.totalMinutes - emp.targetMinutes);
                  const isPositive = monthDiff >= 0;
                  
                  return (
                    <TableRow key={emp.employeeId} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        {emp.firstName} {emp.lastName}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{emp.pensum}%</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMinutes(emp.totalMinutes)}</TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">{formatMinutes(emp.targetMinutes)}</TableCell>
                      <TableCell className={`text-right font-semibold tabular-nums ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPositive && monthDiff > 0 ? "+" : ""}{formatMinutes(monthDiff)}
                      </TableCell>
                      <TableCell className="text-right border-l pl-4 tabular-nums">{formatMinutes(emp.yearTotalMinutes)}</TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">{formatMinutes(emp.yearTargetMinutes)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

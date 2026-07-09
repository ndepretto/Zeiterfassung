import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarIcon, Plus, Trash2, Clock, CheckCircle2 } from "lucide-react";
import { cn, calculateIntervalDuration } from "@/lib/utils";

import { 
  useListEmployees, 
  useCreateTimeEntry,
  useListTimeEntries,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
  getListTimeEntriesQueryKey,
  getListEmployeesQueryKey
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

const timePattern = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

const intervalSchema = z.object({
  comeTime: z.string().regex(timePattern, "Format: HH:MM"),
  goTime: z.string().regex(timePattern, "Format: HH:MM"),
}).refine(data => {
  if (!data.comeTime || !data.goTime) return true;
  const come = parseInt(data.comeTime.replace(':', ''), 10);
  const go = parseInt(data.goTime.replace(':', ''), 10);
  return go > come;
}, {
  message: "Gehen muss nach Kommen sein",
  path: ["goTime"]
});

const timeEntrySchema = z.object({
  employeeId: z.string().min(1, "Mitarbeiter auswählen"),
  date: z.date({ required_error: "Datum auswählen" }),
  intervals: z.array(intervalSchema).min(1, "Mindestens ein Intervall erforderlich"),
  note: z.string().optional(),
});

type TimeEntryFormValues = z.infer<typeof timeEntrySchema>;

export function TimeEntry() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date>(new Date());
  const [employeeId, setEmployeeId] = useState<string>("");
  const [existingEntryId, setExistingEntryId] = useState<number | null>(null);

  const { data: employees, isLoading: isLoadingEmployees } = useListEmployees({ 
    query: { queryKey: getListEmployeesQueryKey() } 
  });

  const createMutation = useCreateTimeEntry();
  const updateMutation = useUpdateTimeEntry();
  const deleteMutation = useDeleteTimeEntry();

  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      employeeId: "",
      date: new Date(),
      intervals: [{ comeTime: "08:00", goTime: "12:00" }, { comeTime: "13:00", goTime: "17:00" }],
      note: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "intervals",
  });

  // Watch for dynamic changes to form state
  const formValues = form.watch();

  // Calculate total preview
  const previewTotalMinutes = formValues.intervals?.reduce((total, interval) => {
    return total + calculateIntervalDuration(interval.comeTime, interval.goTime);
  }, 0) || 0;

  // Check if entry exists for this employee/date
  const dateStr = format(date, "yyyy-MM-dd");
  const { data: existingEntries, isLoading: isLoadingEntries } = useListTimeEntries(
    { employeeId: employeeId ? parseInt(employeeId) : undefined, dateFrom: dateStr, dateTo: dateStr },
    { 
      query: { 
        enabled: !!employeeId && !!date,
        queryKey: getListTimeEntriesQueryKey({ employeeId: employeeId ? parseInt(employeeId) : undefined, dateFrom: dateStr, dateTo: dateStr })
      } 
    }
  );

  useEffect(() => {
    if (existingEntries && existingEntries.length > 0) {
      const entry = existingEntries[0];
      setExistingEntryId(entry.id);
      form.reset({
        employeeId: employeeId,
        date: date,
        intervals: entry.intervals,
        note: entry.note || "",
      });
    } else if (existingEntries && existingEntries.length === 0) {
      setExistingEntryId(null);
      // Keep selected employee and date, reset the rest to defaults
      form.reset({
        employeeId: employeeId,
        date: date,
        intervals: [{ comeTime: "08:00", goTime: "12:00" }, { comeTime: "13:00", goTime: "17:00" }],
        note: "",
      });
    }
  }, [existingEntries, employeeId, date, form]);

  const onSubmit = (data: TimeEntryFormValues) => {
    const payload = {
      employeeId: parseInt(data.employeeId),
      date: format(data.date, "yyyy-MM-dd"),
      intervals: data.intervals,
      note: data.note,
    };

    if (existingEntryId) {
      updateMutation.mutate(
        { id: existingEntryId, data: { intervals: payload.intervals, note: payload.note } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
            toast({ title: "Gespeichert", description: "Zeiteintrag aktualisiert." });
          },
          onError: () => {
            toast({ title: "Fehler", description: "Speichern fehlgeschlagen.", variant: "destructive" });
          }
        }
      );
    } else {
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: (newEntry) => {
            setExistingEntryId(newEntry.id);
            queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
            toast({ title: "Gespeichert", description: "Zeiteintrag erstellt." });
          },
          onError: () => {
            toast({ title: "Fehler", description: "Erstellen fehlgeschlagen.", variant: "destructive" });
          }
        }
      );
    }
  };

  const handleDelete = () => {
    if (!existingEntryId) return;
    deleteMutation.mutate(
      { id: existingEntryId },
      {
        onSuccess: () => {
          setExistingEntryId(null);
          form.reset({
            employeeId,
            date,
            intervals: [{ comeTime: "08:00", goTime: "12:00" }, { comeTime: "13:00", goTime: "17:00" }],
            note: "",
          });
          queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
          toast({ title: "Gelöscht", description: "Zeiteintrag wurde entfernt." });
        }
      }
    );
  };

  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Zeiterfassung</h1>
        <p className="text-muted-foreground text-sm">
          Erfassen Sie Arbeitszeiten präzise auf den Tag genau.
        </p>
      </div>

      <Card className="shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader className="bg-muted/20 border-b">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mitarbeiter</FormLabel>
                      <Select 
                        onValueChange={(val) => {
                          field.onChange(val);
                          setEmployeeId(val);
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Mitarbeiter auswählen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingEmployees ? (
                            <SelectItem value="loading" disabled>Lade...</SelectItem>
                          ) : (
                            employees?.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id.toString()}>
                                {emp.firstName} {emp.lastName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col pt-1">
                      <FormLabel>Datum</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd.MM.yyyy")
                              ) : (
                                <span>Datum wählen</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(val) => {
                              if (val) {
                                field.onChange(val);
                                setDate(val);
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardHeader>
            
            <CardContent className="pt-6 space-y-6">
              {!employeeId ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                  <Clock className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p>Bitte wählen Sie zuerst einen Mitarbeiter aus.</p>
                </div>
              ) : isLoadingEntries ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Intervalle</h3>
                    {existingEntryId && (
                      <span className="flex items-center text-sm text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Eintrag existiert
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-start gap-4">
                        <FormField
                          control={form.control}
                          name={`intervals.${index}.comeTime`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              {index === 0 && <FormLabel>Kommen (HH:MM)</FormLabel>}
                              <FormControl>
                                <Input placeholder="08:00" {...field} className="font-mono" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className={`flex items-center justify-center ${index === 0 ? 'mt-8' : 'mt-2'} text-muted-foreground`}>
                          —
                        </div>
                        <FormField
                          control={form.control}
                          name={`intervals.${index}.goTime`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              {index === 0 && <FormLabel>Gehen (HH:MM)</FormLabel>}
                              <FormControl>
                                <Input placeholder="12:00" {...field} className="font-mono" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className={`${index === 0 ? 'mt-8' : 'mt-2'}`}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => append({ comeTime: "", goTime: "" })}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Intervall hinzufügen
                    </Button>
                  </div>

                  <div className="pt-4 border-t">
                    <FormField
                      control={form.control}
                      name="note"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bemerkung (optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Krank, Ferien, o.ä." className="resize-none" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
            </CardContent>

            {employeeId && !isLoadingEntries && (
              <CardFooter className="bg-muted/10 border-t flex justify-between items-center py-4">
                <div className="flex items-center text-sm">
                  <span className="text-muted-foreground mr-2">Total berechnet:</span>
                  <span className="font-bold text-lg tabular-nums">
                    {Math.floor(previewTotalMinutes / 60)}:{(previewTotalMinutes % 60).toString().padStart(2, '0')} h
                  </span>
                </div>
                <div className="flex gap-2">
                  {existingEntryId && (
                    <Button 
                      type="button" 
                      variant="destructive" 
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                    >
                      Eintrag löschen
                    </Button>
                  )}
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="min-w-[120px]"
                  >
                    {existingEntryId ? "Aktualisieren" : "Speichern"}
                  </Button>
                </div>
              </CardFooter>
            )}
          </form>
        </Form>
      </Card>
    </div>
  );
}

# Zeiterfassung

Eine Zeiterfassungs-App für mehrere Mitarbeiter mit Kommen/Gehen-Erfassung, Mitarbeiterverwaltung und detaillierten Monatsberichten.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API Server starten (Port 8080)
- `pnpm --filter @workspace/zeiterfassung run dev` — Frontend starten
- `pnpm run typecheck` — vollständiger Typecheck über alle Pakete
- `pnpm run build` — Typecheck + Build aller Pakete
- `pnpm --filter @workspace/api-spec run codegen` — API Hooks und Zod-Schemas neu generieren
- `pnpm --filter @workspace/db run push` — DB-Schema-Änderungen pushen (nur Dev)
- Required env: `DATABASE_URL` — Postgres-Verbindungsstring

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter (Routing) + TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validierung: Zod (`zod/v4`), `drizzle-zod`
- API-Codegen: Orval (aus OpenAPI-Spec)
- Build: esbuild (CJS Bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI-Spec (Quelle der Wahrheit für alle API-Verträge)
- `lib/db/src/schema/employees.ts` — Mitarbeiter-Tabelle
- `lib/db/src/schema/timeEntries.ts` — Zeiteinträge-Tabelle (mit `intervals: TimeInterval[]` als JSON)
- `artifacts/api-server/src/routes/` — Express-Route-Handler
- `artifacts/zeiterfassung/src/` — React-Frontend

## Architecture decisions

- Kommen/Gehen-Paare pro Tag werden als `intervals: [{comeTime, goTime}]` JSON-Array gespeichert (flexibel, keine feste Anzahl)
- Uniqueness-Constraint auf `(employee_id, date)` in `time_entries` — ein Eintrag pro Mitarbeiter/Tag, POST macht Upsert
- Monats-Soll-Stunden werden proportional zu Arbeitstagen berechnet (annualHours × pensum% × daysInMonth/daysInYear)
- OpenAPI-Spec verwendet `/reports/employee-monthly` mit Query-Param `employeeId` statt Pfad-Parameter, um Orval-Namenkollisionen zu vermeiden

## Product

- **Dashboard**: Übersicht aller Mitarbeiter — Monatsstunden vs. Soll, Jahresfortschritt
- **Mitarbeiter**: Anlegen, bearbeiten, löschen; Pensum (%) und Jahresarbeitszeit hinterlegen
- **Zeiterfassung**: Tageserfassung mit mehreren Kommen/Gehen-Paaren pro Mitarbeiter
- **Berichte**: Monatsansicht mit Stunden pro Mitarbeiter, Soll-Ist-Vergleich, Differenz

## User preferences

_Benutzersprache: Deutsch_

## Gotchas

- Orval generiert `zod.date()` (nicht `zod.coerce.date()`) für Query-Params mit `format: date`. HTTP-Query-Strings kommen als Strings an und schlagen die Zod-Validierung fehl. Lösung: Query-Params für Datumsfelder manuell parsen (siehe `parseListQuery` in `timeEntries.ts`).
- Datum-zu-String-Konvertierung: `toDateString(date: Date)` nutzt `.getUTCFullYear()` etc., um Zeitzonenprobleme zu vermeiden.
- OpenAPI-Body-Schema-Namen müssen Entity-basiert sein (z.B. `EmployeeInput`, nicht `CreateEmployeeBody`), sonst TS2308-Kollision.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

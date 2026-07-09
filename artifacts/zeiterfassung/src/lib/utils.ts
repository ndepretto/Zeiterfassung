import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMinutes(totalMinutes: number): string {
  const isNegative = totalMinutes < 0;
  const absMinutes = Math.abs(totalMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  const formattedMinutes = minutes.toString().padStart(2, "0");
  return `${isNegative ? "-" : ""}${hours}:${formattedMinutes}`;
}

export function formatTimeInterval(comeTime: string, goTime: string): string {
  return `Kommen: ${comeTime} — Gehen: ${goTime}`;
}

export function calculateIntervalDuration(comeTime: string, goTime: string): number {
  if (!comeTime || !goTime) return 0;
  const [comeH, comeM] = comeTime.split(':').map(Number);
  const [goH, goM] = goTime.split(':').map(Number);
  
  if (isNaN(comeH) || isNaN(comeM) || isNaN(goH) || isNaN(goM)) return 0;
  
  const comeTotal = comeH * 60 + comeM;
  const goTotal = goH * 60 + goM;
  
  return goTotal >= comeTotal ? goTotal - comeTotal : 0;
}

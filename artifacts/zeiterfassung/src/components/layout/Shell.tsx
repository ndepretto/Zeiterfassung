import { Link, useLocation } from "wouter";
import { Clock, LayoutDashboard, Users, FileText, LogOut } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ShellProps {
  children: ReactNode;
  onLogout?: () => void;
}

export function Shell({ children, onLogout }: ShellProps) {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Mitarbeiter", href: "/mitarbeiter", icon: Users },
    { name: "Zeiterfassung", href: "/zeiterfassung", icon: Clock },
    { name: "Berichte", href: "/berichte", icon: FileText },
  ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      {/* Sidebar */}
      <div className="w-full md:w-64 border-r bg-sidebar text-sidebar-foreground flex-shrink-0 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border gap-3 font-semibold text-lg">
          <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          Zeiterfassung
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {onLogout && (
          <div className="px-4 pb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            >
              <LogOut className="w-4 h-4" />
              Abmelden
            </Button>
          </div>
        )}
      </div>

      {/* Mobile nav header */}
      <div className="md:hidden flex h-14 items-center justify-between px-4 border-b bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 font-semibold">
          <Clock className="w-5 h-5 text-primary" />
          Zeiterfassung
        </div>
        {onLogout && (
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-sidebar-foreground/70 gap-2">
            <LogOut className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t bg-card z-50 flex items-center justify-around px-2">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5 mb-1" />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

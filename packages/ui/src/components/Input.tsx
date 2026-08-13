import type { LucideIcon } from "lucide-react";
import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "../lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Icône (lucide-react) affichée à gauche du champ — refonte UI/UX Phase 5 (2026-07-30). */
  icon?: LucideIcon;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, icon: Icon, ...props }, ref) => {
  const input = (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border-2 border-button/30 bg-background text-foreground px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive",
        Icon && "pl-9",
        className
      )}
      {...props}
    />
  );

  if (!Icon) return input;
  return (
    <div className="relative">
      <Icon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      {input}
    </div>
  );
});
Input.displayName = "Input";

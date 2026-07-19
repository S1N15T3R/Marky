import * as React from "react";
import { cn } from "@/lib/utils";

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "ghost" | "accent" | "outline";
    size?: "sm" | "md" | "icon";
  }
>(({ className, variant = "default", size = "md", ...props }, ref) => {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-panel font-mono text-xs select-none disabled:opacity-40 disabled:pointer-events-none";
  const variants: Record<string, string> = {
    default: "bg-surface-2 text-text border border-border hover:border-accent",
    ghost: "text-text-muted hover:text-text hover:bg-surface-2",
    accent: "bg-accent text-black hover:opacity-90",
    outline: "border border-border text-text hover:bg-surface-2",
  };
  const sizes: Record<string, string> = {
    sm: "h-7 px-2",
    md: "h-8 px-3",
    icon: "h-8 w-8",
  };
  return (
    <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />
  );
});
Button.displayName = "Button";
export { Button };

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-panel bg-surface-2 border border-border px-2 py-1 text-xs text-text outline-none focus:border-accent placeholder:text-text-muted",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-panel bg-surface-2 border border-border px-2 py-1 text-xs text-text outline-none focus:border-accent placeholder:text-text-muted",
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-panel bg-surface-2 border border-border px-2 py-1 text-xs text-text outline-none focus:border-accent",
        props.className
      )}
    />
  );
}

export function Label({ children, ...rest }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label {...rest} className={cn("text-[11px] uppercase tracking-wide text-text-muted", rest.className)}>
      {children}
    </label>
  );
}

export function Modal({
  open,
  onClose,
  children,
  title,
  width = "max-w-2xl",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className={cn(
          "glass w-full rounded-float border border-border shadow-glow animate-[fadeIn_150ms_ease] max-h-[85vh] overflow-hidden flex flex-col",
          width
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-bold text-accent">{title}</h2>
            <button className="text-text-muted hover:text-text" onClick={onClose}>
              ✕
            </button>
          </div>
        )}
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

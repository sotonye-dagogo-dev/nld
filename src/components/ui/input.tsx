import type { InputHTMLAttributes, ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Universal Input with label/hint/error (§13 baseline). All forms use this,
// never bespoke <input> markup.

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  showPasswordToggle?: boolean;
}

export function Input({ label, hint, error, className, id, showPasswordToggle, ...rest }: InputProps) {
  const inputId = id ?? rest.name;
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = rest.type === "password" && showPasswordToggle;
  const effectiveType = isPasswordField && showPassword ? "text" : rest.type ?? "text";

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={effectiveType}
          autoComplete={rest.autoComplete ?? (isPasswordField ? "current-password" : "off")}
          aria-invalid={Boolean(error)}
          className={cn(
            "rounded-lg border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            isPasswordField ? "pr-12" : "pr-3",
            error ? "border-danger" : "border-border",
            className,
          )}
          {...rest}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            )}
          </button>
        )}
      </div>
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/** Wrapper for non-input fields (selects, textareas) that share the label/error pattern. */
export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-text-primary">{label}</span>}
      {children}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}
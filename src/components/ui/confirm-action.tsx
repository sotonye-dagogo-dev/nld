import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

interface DestructiveActionConfig {
  /** Title shown in confirmation modal */
  title: string;
  /** Description shown in confirmation modal */
  description: string;
  /** Button text for the destructive action */
  actionText: string;
  /** Button text for cancel */
  cancelText?: string;
  /** Timeout in ms for undo window (default: 5000) */
  undoTimeout?: number;
  /** Variant for the action button */
  variant?: "destructive" | "primary";
}

interface ConfirmActionState {
  isOpen: boolean;
  isPending: boolean;
  isUndoing: boolean;
  undoTimeoutId: ReturnType<typeof setTimeout> | null;
  undoCountdown: number;
}

interface UseConfirmActionReturn {
  /** Trigger the confirmation modal */
  open: () => void;
  /** Close the confirmation modal */
  close: () => void;
  /** Execute the destructive action after confirmation */
  execute: (action: () => Promise<void>) => Promise<void>;
  /** Undo the last executed action */
  undo: () => void;
  /** Current state */
  state: ConfirmActionState;
}

/**
 * Hook for managing destructive actions with confirmation modal and undo timeout.
 * Provides a global pattern for actions like delete, remove, replace that need
 * confirmation and an undo window.
 */
export function useConfirmAction(config: DestructiveActionConfig): UseConfirmActionReturn {
  const {
    title,
    description,
    actionText,
    cancelText = "Cancel",
    undoTimeout = 5000,
    variant = "destructive",
  } = config;

  const [state, setState] = useState<ConfirmActionState>({
    isOpen: false,
    isPending: false,
    isUndoing: false,
    undoTimeoutId: null,
    undoCountdown: 0,
  });

  const pendingActionRef = useRef<(() => Promise<void>) | null>(null);
  const undoTimeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Countdown for undo window
  useEffect(() => {
    if (state.isUndoing && undoTimeoutIdRef.current) {
      const interval = setInterval(() => {
        setState((prev) => {
          if (prev.undoCountdown <= 1) {
            clearInterval(interval);
            return { ...prev, isUndoing: false, undoCountdown: 0, undoTimeoutId: null };
          }
          return { ...prev, undoCountdown: prev.undoCountdown - 100 };
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [state.isUndoing]);

  const open = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: true, isPending: false }));
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false, isPending: false }));
    pendingActionRef.current = null;
  }, []);

  const execute = useCallback(
    async (action: () => Promise<void>) => {
      pendingActionRef.current = action;
      setState((prev) => ({ ...prev, isPending: true }));

      try {
        await action();

        // Start undo window
        const timeoutId = setTimeout(() => {
          setState((prev) => ({ ...prev, isUndoing: false, undoCountdown: 0, undoTimeoutId: null }));
          undoTimeoutIdRef.current = null;
        }, undoTimeout);
        undoTimeoutIdRef.current = timeoutId;

        setState((prev) => ({
          ...prev,
          isOpen: false,
          isPending: false,
          isUndoing: true,
          undoTimeoutId: timeoutId,
          undoCountdown: undoTimeout,
        }));
      } catch (err) {
        setState((prev) => ({ ...prev, isPending: false }));
        throw err;
      }
    },
    [undoTimeout],
  );

  const undo = useCallback(() => {
    if (undoTimeoutIdRef.current) {
      clearTimeout(undoTimeoutIdRef.current);
      undoTimeoutIdRef.current = null;
    }
    setState((prev) => ({ ...prev, isUndoing: false, undoCountdown: 0, undoTimeoutId: null }));
  }, []);

  return {
    open,
    close,
    execute,
    undo,
    state,
  };
}

/**
 * ConfirmActionWrapper - A wrapper component that provides the confirmation modal
 * and undo toast for a destructive action.
 *
 * Usage:
 * ```tsx
 * const { open, state, execute } = useConfirmAction({
 *   title: "Delete Devotional",
 *   description: "This will permanently delete the devotional and all its days.",
 *   actionText: "Delete",
 * });
 *
 * return (
 *   <>
 *     <Button onClick={open}>Delete</Button>
 *     <ConfirmActionWrapper
 *       state={state}
 *       onExecute={(action) => execute(action)}
 *       onUndo={handleUndo}
 *       config={{
 *         title: "Delete Devotional",
 *         description: "This will permanently delete the devotional and all its days.",
 *         actionText: "Delete",
 *       }}
 *     />
 *   </>
 * );
 * ```
 */
interface ConfirmActionWrapperProps {
  state: ConfirmActionState & { close: () => void; undo: () => void };
  config: DestructiveActionConfig;
  onExecute: (action: () => Promise<void>) => Promise<void>;
  onUndo?: () => void;
  children?: ReactNode;
}

export function ConfirmActionWrapper({
  state,
  config,
  onExecute,
  onUndo,
  children,
}: ConfirmActionWrapperProps) {
  const {
    title,
    description,
    actionText,
    cancelText = "Cancel",
  } = config;

  const handleConfirm = useCallback(async () => {
    // The actual action is handled by the parent via onExecute
  }, []);

  const handleCancel = useCallback(() => {
    state.close();
  }, [state]);

  return (
    <>
      {children}
      <ConfirmDialog
        open={state.isOpen}
        title={title}
        message={description}
        confirmLabel={actionText}
        cancelLabel={cancelText}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      {state.isUndoing && (
        <UndoToast
          countdown={state.undoCountdown}
          timeout={config.undoTimeout ?? 5000}
          onUndo={onUndo}
        />
      )}
    </>
  );
}

interface UndoToastProps {
  countdown: number;
  timeout: number;
  onUndo?: () => void;
}

function UndoToast({ countdown, timeout, onUndo }: UndoToastProps) {
  const progress = ((timeout - countdown) / timeout) * 100;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-lg animate-slide-in"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-text-primary">
          <RotateCcw className="h-5 w-5 text-primary" />
          <span className="font-medium">Action completed</span>
        </div>
        <div className="relative h-2 w-48 overflow-hidden rounded-full bg-background">
          <div
            className="h-full bg-primary transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      {onUndo && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onUndo}
          className="ml-2 whitespace-nowrap"
        >
          <X className="h-3.5 w-3.5 mr-1.5" />
          Undo
        </Button>
      )}
    </div>
  );
}

/**
 * Higher-order component for creating destructive action buttons with built-in
 * confirmation and undo support.
 *
 * Usage:
 * ```tsx
 * const DeleteButton = withConfirmAction({
 *   title: "Delete Item",
 *   description: "This action cannot be undone after 5 seconds.",
 *   actionText: "Delete",
 *   variant: "destructive",
 * });
 *
 * // In component:
 * <DeleteButton onAction={async () => await deleteItem(id)}>Delete</Button>
 * ```
 */
interface WithConfirmActionProps {
  config: DestructiveActionConfig;
  onAction: () => Promise<void>;
  onUndo?: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function WithConfirmAction({
  config,
  onAction,
  onUndo,
  children,
  className,
  disabled = false,
}: WithConfirmActionProps) {
  const { open, state, execute, undo } = useConfirmAction(config);

  const handleClick = async () => {
    if (disabled) return;
    await execute(onAction);
  };

  const handleUndo = () => {
    undo();
    onUndo?.();
  };

  return (
    <>
      <Button
        onClick={open}
        disabled={disabled || state.isPending}
        variant={config.variant === "destructive" ? "destructive" : "primary"}
        className={className}
        loading={state.isPending}
      >
        {children}
      </Button>
      <ConfirmActionWrapper
        state={{ ...state, close, undo }}
        config={config}
        onExecute={execute}
        onUndo={handleUndo}
      />
    </>
  );
}
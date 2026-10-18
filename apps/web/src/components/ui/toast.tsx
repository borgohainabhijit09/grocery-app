"use client";

import * as React from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import * as ToastPrimitive from "radix-ui/toast";

import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "error";

export type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastItem = ToastOptions & { id: number };

const EMPTY: ToastItem[] = [];
const listeners = new Set<() => void>();
let items: ToastItem[] = [];
let counter = 0;

function emit() {
  for (const listener of listeners) listener();
}

export function toast(options: ToastOptions) {
  const id = ++counter;
  items = [...items, { variant: "default", duration: 4000, ...options, id }];
  emit();
  return id;
}

export function dismissToast(id: number) {
  items = items.filter((item) => item.id !== id);
  emit();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function useToasts(): ToastItem[] {
  return React.useSyncExternalStore(subscribe, () => items, () => EMPTY);
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: "border-border",
  success: "border-green-500/40 bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-100",
  error: "border-destructive/40 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100",
};

const VARIANT_ICONS = {
  default: Info,
  success: CheckCircle2,
  error: XCircle,
} as const;

export function Toaster() {
  const toasts = useToasts();

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((item) => {
        const variant = item.variant ?? "default";
        const Icon = VARIANT_ICONS[variant];
        return (
          <ToastPrimitive.Root
            key={item.id}
            duration={item.duration}
            onOpenChange={(open) => {
              if (!open) dismissToast(item.id);
            }}
            className={cn(
              "animate-slide-in-right bg-card text-card-foreground flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg",
              VARIANT_STYLES[variant]
            )}
          >
            <Icon className="mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <ToastPrimitive.Title className="text-sm font-medium">
                {item.title}
              </ToastPrimitive.Title>
              {item.description ? (
                <ToastPrimitive.Description className="mt-1 text-xs opacity-80">
                  {item.description}
                </ToastPrimitive.Description>
              ) : null}
            </div>
            <ToastPrimitive.Close
              className="rounded-sm opacity-60 transition-opacity hover:opacity-100"
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        );
      })}
      <ToastPrimitive.Viewport className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-sm" />
    </ToastPrimitive.Provider>
  );
}

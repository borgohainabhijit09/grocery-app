"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function FilterDrawer({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open filters"
      >
        <SlidersHorizontal className="size-4" />
        Filters
      </Button>

      {open &&
        createPortal(
          <>
            <div
              onClick={() => setOpen(false)}
              aria-hidden="true"
              className="animate-fade-in fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
            />

            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              className="animate-slide-in-left fixed inset-y-0 left-0 z-50 flex h-full w-full max-w-xs flex-col border-r bg-background shadow-2xl lg:hidden"
            >
              <div className="flex items-center justify-between border-b px-5 py-4">
                <h2 className="flex items-center gap-2 font-semibold">
                  <SlidersHorizontal className="size-4" />
                  Filters
                </h2>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setOpen(false)}
                  aria-label="Close filters"
                >
                  <X className="size-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">{children}</div>
            </aside>
          </>,
          document.body
        )}
    </>
  );
}

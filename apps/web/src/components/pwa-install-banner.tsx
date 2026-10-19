"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "pwa-install-dismissed";
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function isDismissed() {
  try {
    const v = localStorage.getItem(DISMISSED_KEY);
    return !!v && Date.now() - Number(v) < SNOOZE_MS;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {}
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    !!(navigator as { standalone?: boolean }).standalone
  );
}

export function PwaInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    if (isDismissed() || isStandalone()) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

    if (isIos) {
      // iOS doesn't fire beforeinstallprompt — show manual instructions
      const timer = setTimeout(() => {
        setShowIos(true);
        setVisible(true);
      }, 4000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), 3000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    markDismissed();
    setVisible(false);
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") markDismissed();
    setPrompt(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install app"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm"
    >
      <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xl">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-xl text-primary-foreground">
          🥬
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">Add to Home Screen</p>
          {showIos ? (
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              Tap <Share className="mb-0.5 inline size-3" /> Share, then{" "}
              <strong>Add to Home Screen</strong>
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              Get quick access to Fresh Basket from your phone
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {!showIos && (
            <Button size="sm" onClick={install} className="h-8 px-3 text-xs">
              <Download className="size-3" />
              Install
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={dismiss}
            aria-label="Dismiss install prompt"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

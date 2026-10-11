"use client";

import React from "react";
import { AppProvider } from "@/store/app-store";
import { NotesProvider } from "@/store/notes-store";
import { ToastProvider } from "@/store/toast-store";
import { TimerProvider } from "@/store/timer-store";
import { SessionFlowProvider } from "@/components/timer/SessionFlow";
import { Shell } from "@/components/layout/Shell";

export function Providers({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
    if ("caches" in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key);
        }
      });
    }
  }, []);

  return (
    <AppProvider>
      <NotesProvider>
        <ToastProvider>
          <TimerProvider>
            <SessionFlowProvider>
              <Shell>{children}</Shell>
            </SessionFlowProvider>
          </TimerProvider>
        </ToastProvider>
      </NotesProvider>
    </AppProvider>
  );
}
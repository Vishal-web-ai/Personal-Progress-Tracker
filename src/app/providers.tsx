"use client";

import React from "react";
import { AppProvider } from "@/store/app-store";
import { NotesProvider } from "@/store/notes-store";
import { ToastProvider } from "@/store/toast-store";
import { TimerProvider } from "@/store/timer-store";
import { SessionFlowProvider } from "@/components/timer/SessionFlow";
import { Shell } from "@/components/layout/Shell";

export function Providers({ children }: { children: React.ReactNode }) {
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
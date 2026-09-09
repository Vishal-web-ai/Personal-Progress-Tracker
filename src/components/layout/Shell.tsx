"use client";

import React from "react";
import { Sidebar, BottomNav } from "@/components/navigation/Navigation";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="motion-page mx-auto w-full max-w-[1440px] flex-1 px-4 pb-36 pt-5 sm:px-6 lg:px-10 lg:pb-16 lg:pt-8 xl:px-14">
          <div className="mx-auto w-full max-w-[1200px]">{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
"use client";

import { useSyncExternalStore } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Logo } from "./logo";
import { initials } from "@/lib/utils";
import { SideNav } from "./side-nav";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "./theme-toggle";

const sidebarStorageKey = "beo-sidebar-collapsed";
const sidebarChangeEvent = "beo-sidebar-change";

function subscribeToSidebar(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(sidebarChangeEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(sidebarChangeEvent, onStoreChange);
  };
}

function sidebarSnapshot() {
  return window.localStorage.getItem(sidebarStorageKey) === "true";
}

export function AppShell({ children, name = "Amara Okafor", track = "Drawing", admin = false }: { children: React.ReactNode; name?: string; track?: string; admin?: boolean }) {
  const collapsed = useSyncExternalStore(subscribeToSidebar, sidebarSnapshot, () => false);

  function toggleSidebar() {
    window.localStorage.setItem(sidebarStorageKey, String(!collapsed));
    window.dispatchEvent(new Event(sidebarChangeEvent));
  }

  return (
    <div className={`app-layout${collapsed ? " sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <Logo href={null} />
        <button
          className="sidebar-toggle"
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
        <SideNav admin={admin} />
        <div className="appearance-control">
          <ThemeToggle />
        </div>
        <div className="student-card">
          <span className="student-avatar">{initials(name)}</span>
          <div className="student-details"><strong>{name}</strong><span>{admin ? "Administrator" : `${track} student`}</span></div>
          <SignOutButton admin={admin} />
        </div>
      </aside>
      <main className="main">
        <div className="mobile-top">
          <Logo href={null} />
          <div className="mobile-top-actions"><ThemeToggle compact /><SignOutButton admin={admin} /></div>
        </div>
        {children}
      </main>
      <SideNav admin={admin} mobile />
    </div>
  );
}

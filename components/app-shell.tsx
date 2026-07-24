import { Logo } from "./logo";
import { initials } from "@/lib/utils";
import { SideNav } from "./side-nav";
import { SignOutButton } from "./sign-out-button";

export function AppShell({ children, name = "Amara Okafor", track = "Drawing", admin = false }: { children: React.ReactNode; name?: string; track?: string; admin?: boolean }) {
  const homeHref = admin ? "/admin" : "/dashboard";
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Logo href={homeHref} />
        <SideNav admin={admin} />
        <div className="student-card">
          <span className="student-avatar">{initials(name)}</span>
          <div><strong>{name}</strong><span>{admin ? "Administrator" : `${track} student`}</span></div>
          <SignOutButton admin={admin} />
        </div>
      </aside>
      <main className="main">
        <div className="mobile-top"><Logo href={homeHref} /><SignOutButton admin={admin} /></div>
        {children}
      </main>
      <SideNav admin={admin} mobile />
    </div>
  );
}

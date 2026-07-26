import type { CSSProperties, ReactNode } from "react";

function Bone({ width, height, className = "" }: { width?: string | number; height?: string | number; className?: string }) {
  return <span className={`skeleton-bone ${className}`} style={{ width, height } as CSSProperties} />;
}

function SkeletonShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-layout skeleton-screen" role="status" aria-busy="true" aria-label="Loading page">
      <aside className="sidebar skeleton-sidebar">
        <div className="skeleton-brand"><Bone width={58} height={40} /><Bone width={125} height={18} /></div>
        <div className="side-nav">
          {[0, 1, 2, 3, 4].map((item) => <Bone className="skeleton-nav-item" key={item} />)}
        </div>
        <div className="student-card">
          <Bone className="skeleton-avatar" />
          <div className="skeleton-stack"><Bone width={116} height={12} /><Bone width={78} height={9} /></div>
        </div>
      </aside>
      <main className="main">
        <div className="mobile-top"><div className="skeleton-brand"><Bone width={48} height={34} /><Bone width={112} height={16} /></div><Bone width={34} height={34} /></div>
        {children}
      </main>
      <div className="skeleton-mobile-nav" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((item) => <Bone width={48} height={38} key={item} />)}
      </div>
    </div>
  );
}

function PageHeadingSkeleton() {
  return <div className="dash-head skeleton-heading"><div><Bone width={145} height={12} /><Bone width={245} height={44} /></div><Bone width={126} height={31} /></div>;
}

export function StudentScreenSkeleton({ view = "dashboard" }: { view?: "dashboard" | "resources" | "settings" | "admin" }) {
  return (
    <SkeletonShell>
      <PageHeadingSkeleton />
      {view === "dashboard" && (
        <>
          <section className="progress-card skeleton-panel"><div className="skeleton-stack"><Bone width="42%" height={28} /><Bone width="66%" height={12} /></div><Bone width={68} height={45} /><Bone className="skeleton-progress" /></section>
          <section className="welcome-card skeleton-panel"><div className="skeleton-stack skeleton-copy"><Bone width={100} height={10} /><Bone width="78%" height={30} /><Bone width="100%" height={12} /><Bone width="86%" height={12} /></div><Bone className="skeleton-video" /></section>
          <div className="content-title"><Bone width={150} height={27} /><Bone width={105} height={12} /></div>
          <div className="lesson-list">{[0, 1, 2, 3, 4].map((item) => <div className="lesson-row skeleton-panel" key={item}><Bone width={46} height={46} /><div className="skeleton-stack"><Bone width="46%" height={15} /><Bone width="30%" height={10} /></div><Bone className="skeleton-circle" /></div>)}</div>
        </>
      )}
      {view === "resources" && (
        <>
          <section className="resource-grid">{[0, 1, 2].map((item) => <article className="resource-card skeleton-panel skeleton-stack" key={item}><Bone width={26} height={26} /><Bone width="66%" height={29} /><Bone width="100%" height={12} /><Bone width="86%" height={12} /><Bone width="42%" height={12} /></article>)}</section>
          <section className="surface skeleton-panel skeleton-stack skeleton-wide-panel"><Bone width={155} height={10} /><Bone width={230} height={28} /><Bone width="74%" height={13} /></section>
        </>
      )}
      {view === "settings" && (
        <>
          <div className="settings-grid">
            <section className="surface skeleton-panel skeleton-form">{[0, 1, 2, 3].map((item) => <div className="skeleton-stack" key={item}><Bone width={92} height={10} /><Bone width="100%" height={50} /></div>)}</section>
            <aside className="settings-note skeleton-panel skeleton-stack"><Bone width="62%" height={16} /><Bone width="100%" height={12} /><Bone width="84%" height={12} /><Bone width="55%" height={12} /></aside>
          </div>
          <section className="surface skeleton-panel skeleton-wide-panel skeleton-stack"><Bone width={210} height={27} /><Bone width="70%" height={12} /><Bone width="100%" height={58} /></section>
        </>
      )}
      {view === "admin" && (
        <>
          <section className="admin-stats">{[0, 1, 2, 3].map((item) => <div className="stat skeleton-panel skeleton-stack" key={item}><Bone width="70%" height={10} /><Bone width={56} height={34} /></div>)}</section>
          <div className="content-title"><Bone width={205} height={27} /><Bone width={135} height={12} /></div>
          <div className="skeleton-table">{[0, 1, 2, 3, 4, 5].map((item) => <div className="skeleton-table-row" key={item}><Bone width="24%" height={13} /><Bone width="17%" height={13} /><Bone width="14%" height={13} /><Bone width="20%" height={13} /></div>)}</div>
        </>
      )}
    </SkeletonShell>
  );
}

export function LessonScreenSkeleton() {
  return (
    <SkeletonShell>
      <div className="lesson-shell">
        <Bone width={125} height={13} />
        <div className="lesson-heading skeleton-lesson-heading"><div className="skeleton-stack"><Bone width={105} height={11} /><Bone width={330} height={51} /></div><Bone width={122} height={31} /></div>
        <Bone className="skeleton-video skeleton-lesson-video" />
        <div className="lesson-grid">
          <div className="skeleton-stack skeleton-lesson-column">
            <section className="surface skeleton-panel skeleton-stack"><Bone width={150} height={28} /><Bone width="100%" height={13} /><Bone width="92%" height={13} /><Bone width="70%" height={13} /></section>
            <section className="surface skeleton-panel skeleton-stack"><Bone width={140} height={28} />{[0, 1, 2].map((item) => <div className="skeleton-question" key={item}><Bone width="72%" height={14} /><Bone width="100%" height={44} /><Bone width="100%" height={44} /></div>)}</section>
          </div>
          <aside className="surface assignment-card skeleton-panel skeleton-stack"><Bone width="78%" height={28} /><Bone width="100%" height={12} /><Bone width="82%" height={12} /><Bone width="100%" height={118} /><Bone width="100%" height={48} /></aside>
        </div>
      </div>
    </SkeletonShell>
  );
}

export function AuthScreenSkeleton() {
  return (
    <div className="auth-page skeleton-screen" role="status" aria-busy="true" aria-label="Loading sign in">
      <aside className="auth-art skeleton-auth-art"><div className="skeleton-brand"><Bone width={58} height={40} /><Bone width={135} height={18} /></div><div className="skeleton-stack"><Bone width="78%" height={34} /><Bone width="65%" height={34} /><Bone width={180} height={11} /></div></aside>
      <main className="auth-panel"><div className="auth-box skeleton-stack skeleton-auth-box"><div className="skeleton-brand"><Bone width={58} height={40} /><Bone width={135} height={18} /></div><Bone width="76%" height={50} /><Bone width="100%" height={13} /><Bone width="82%" height={13} />{[0, 1, 2].map((item) => <div className="skeleton-stack" key={item}><Bone width={88} height={10} /><Bone width="100%" height={50} /></div>)}<Bone width="100%" height={48} /></div></main>
    </div>
  );
}

export function CheckoutScreenSkeleton() {
  return (
    <div className="shell skeleton-screen" role="status" aria-busy="true" aria-label="Loading checkout">
      <header className="topbar container"><div className="skeleton-brand"><Bone width={58} height={40} /><Bone width={135} height={18} /></div></header>
      <div className="skeleton-checkout container">
        <section className="skeleton-stack"><Bone width={170} height={11} /><Bone width="74%" height={54} /><Bone width="90%" height={14} /><Bone width="66%" height={14} /><Bone className="skeleton-checkout-art" /></section>
        <section className="surface skeleton-panel skeleton-form">{[0, 1, 2, 3].map((item) => <div className="skeleton-stack" key={item}><Bone width={105} height={10} /><Bone width="100%" height={50} /></div>)}<Bone width="100%" height={48} /></section>
      </div>
    </div>
  );
}

export function MarketingScreenSkeleton() {
  return (
    <div className="shell skeleton-screen" role="status" aria-busy="true" aria-label="Loading Beo School of Art">
      <section className="hero skeleton-marketing">
        <header className="topbar container"><div className="skeleton-brand"><Bone width={58} height={40} /><Bone width={135} height={18} /></div><Bone width={180} height={40} /></header>
        <div className="container"><div className="hero-content skeleton-stack"><Bone width={230} height={11} /><Bone width="86%" height={78} /><Bone width="68%" height={78} /><Bone width="80%" height={15} /><Bone width="67%" height={15} /><Bone width={215} height={48} /></div></div>
      </section>
    </div>
  );
}

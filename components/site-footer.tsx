"use client";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span suppressHydrationWarning>© {new Date().getFullYear()}</span> Beo Art Studio. All rights reserved.
    </footer>
  );
}

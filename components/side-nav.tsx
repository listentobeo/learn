"use client";

import { BellRing, BookOpen, CalendarClock, ChartNoAxesColumn, LayoutGrid, MessageCircle, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SideNav({ admin, mobile = false }: { admin: boolean; mobile?: boolean }) {
  const pathname = usePathname();
  const links = admin ? [
    { href: "/admin", label: "Overview", icon: LayoutGrid },
    { href: "/admin/students", label: "Student records", icon: BookOpen },
    { href: "/admin/reviews", label: "Review calls", icon: CalendarClock },
    { href: "/admin/automations", label: "Automations", icon: BellRing },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ] : [
    { href: "/dashboard", label: "My course", icon: LayoutGrid },
    { href: "/progress", label: "Progress", icon: ChartNoAxesColumn },
    { href: "/resources", label: "Resources", icon: BookOpen },
    { href: "/reviews", label: "Review calls", icon: CalendarClock },
    { href: "/settings", label: "Settings", icon: Settings },
  ];
  return (
    <nav className={mobile ? "mobile-nav" : "side-nav"} aria-label={mobile ? "Mobile navigation" : "Main navigation"}>
      {links.map(({ href, label, icon: Icon }, index) => {
        const active = pathname === href || (href === "/admin/students" && pathname.startsWith("/admin/student/"));
        return <Link className={`side-link${active ? " active" : ""}`} href={href} key={`${href}-${label}`} title={!mobile ? label : undefined}><Icon size={17} /><span>{label}</span></Link>;
      })}
      {!mobile && <a className="side-link" href="mailto:support@beoarts.com" title="Support"><MessageCircle size={17} /><span>Support</span></a>}
    </nav>
  );
}

"use client";

import { BookOpen, LayoutGrid, MessageCircle, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SideNav({ admin, mobile = false }: { admin: boolean; mobile?: boolean }) {
  const pathname = usePathname();
  const links = [
    { href: admin ? "/admin" : "/dashboard", label: admin ? "Overview" : "My course", icon: LayoutGrid },
    { href: admin ? "/admin/students" : "/resources", label: admin ? "Student records" : "Resources", icon: BookOpen },
    { href: admin ? "/admin/settings" : "/settings", label: "Settings", icon: Settings },
  ];
  return (
    <nav className={mobile ? "mobile-nav" : "side-nav"} aria-label={mobile ? "Mobile navigation" : "Main navigation"}>
      {links.map(({ href, label, icon: Icon }, index) => {
        const active = pathname === href || (href === "/admin/students" && pathname.startsWith("/admin/student/"));
        return <Link className={`side-link${active ? " active" : ""}`} href={href} key={`${href}-${label}`}><Icon size={17} /> {label}</Link>;
      })}
      <a className="side-link" href="mailto:support@beoarts.com"><MessageCircle size={17} /> Support</a>
    </nav>
  );
}

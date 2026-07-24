"use client";

import { BookOpen, LayoutGrid, MessageCircle, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SideNav({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  const links = [
    { href: admin ? "/admin" : "/dashboard", label: admin ? "Overview" : "My course", icon: LayoutGrid },
    { href: admin ? "/admin" : "/resources", label: admin ? "Student records" : "Resources", icon: BookOpen },
    { href: "/settings", label: "Settings", icon: Settings },
  ];
  return (
    <nav className="side-nav" aria-label="Main navigation">
      {links.map(({ href, label, icon: Icon }, index) => {
        const active = pathname === href || (index === 0 && href === "/admin" && pathname.startsWith("/admin/student"));
        return <Link className={`side-link${active ? " active" : ""}`} href={href} key={`${href}-${label}`}><Icon size={17} /> {label}</Link>;
      })}
      <a className="side-link" href="mailto:support@beoarts.com"><MessageCircle size={17} /> Support</a>
    </nav>
  );
}

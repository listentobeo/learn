import Image from "next/image";
import Link from "next/link";

export function Logo({ href = "/" }: { href?: string | null }) {
  const content = (
    <>
      <Image
        className="brand-logo-image"
        src="/images/beo-art-studio-logo.png"
        alt=""
        width={300}
        height={177}
        priority
      />
      <span>Beo School of Art</span>
    </>
  );
  if (!href) return <div className="brand" aria-label="Beo School of Art">{content}</div>;
  return <Link href={href} className="brand" aria-label="Beo School of Art home">{content}</Link>;
}

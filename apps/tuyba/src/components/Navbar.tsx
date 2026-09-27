import Link from "next/link";

const NAV_LINKS = [
  { label: "Journal", href: "/blog" },
  { label: "About", href: "/about" },
];

export function Navbar() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        background: "rgba(255,255,255,0.88)",
        borderBottom: "1px solid var(--ty-border)",
      }}
    >
      <div
        className="ty-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "64px",
          gap: "1.5rem",
        }}
      >
        <Link href="/" className="ty-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <circle cx="14" cy="14" r="13" fill="#059669" />
            <path d="M18 10a7 7 0 1 1-8.485 8.485A5.5 5.5 0 1 0 18 10z" fill="white" />
            <circle cx="20" cy="9" r="1.2" fill="white" />
          </svg>
          <span>TUYBA</span>
        </Link>

        <nav
          aria-label="Main navigation"
          style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
        >
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="ty-nav-link">
              {link.label}
            </Link>
          ))}
        </nav>

        <Link href="/admin" className="ty-btn-dark">
          Admin
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M2.5 7h9M7.5 3l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </header>
  );
}

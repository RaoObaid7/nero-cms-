import Link from "next/link";

export function SiteFooter() {
  return (
    <footer
      style={{
        background: "var(--ty-bg-dark)",
        color: "var(--ty-text-inverse)",
        marginTop: "auto",
      }}
    >
      <div
        className="ty-container"
        style={{
          padding: "3rem 1.5rem 2rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "2.5rem",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Link href="/" className="ty-footer-logo">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <circle cx="14" cy="14" r="13" fill="#059669" />
              <path d="M18 10a7 7 0 1 1-8.485 8.485A5.5 5.5 0 1 0 18 10z" fill="white" />
              <circle cx="20" cy="9" r="1.2" fill="white" />
            </svg>
            TUYBA
          </Link>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--ty-text-faint)",
              lineHeight: 1.6,
              maxWidth: "22ch",
            }}
          >
            Your guide to halal-certified travel, curated for Muslim families worldwide.
          </p>
        </div>

        {/* Explore */}
        <div>
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--ty-text-faint)",
              marginBottom: "0.75rem",
            }}
          >
            Explore
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {[
              { label: "Journal", href: "/blog" },
              { label: "About", href: "/about" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="ty-footer-link">
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Platform */}
        <div>
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--ty-text-faint)",
              marginBottom: "0.75rem",
            }}
          >
            Platform
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <Link href="/admin" className="ty-footer-link">
              Admin Dashboard
            </Link>
            <Link href="/api/seo-overview" className="ty-footer-link">
              SEO Overview
            </Link>
          </div>
        </div>
      </div>

      <div
        className="ty-container"
        style={{
          padding: "1.25rem 1.5rem",
          borderTop: "1px solid var(--ty-border-dark)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <p style={{ fontSize: "0.8rem", color: "var(--ty-text-faint)" }}>
          © {new Date().getFullYear()} TUYBA. Built on NERO CMS.
        </p>
        <p style={{ fontSize: "0.8rem", color: "var(--ty-text-faint)" }}>
          Powered by <span style={{ color: "var(--ty-accent)", fontWeight: 600 }}>Payload CMS</span>
        </p>
      </div>
    </footer>
  );
}

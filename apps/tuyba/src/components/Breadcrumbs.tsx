import { Link } from "@nero/ui";
import type { BreadcrumbItem } from "@/lib/seo";

/** SEO-103: visible breadcrumb trail with markup, mirroring the JSON-LD `breadcrumbSchema`. */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol style={{ display: "flex", gap: "0.5rem", listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.path} style={{ display: "flex", gap: "0.5rem" }}>
              {isLast ? (
                <span aria-current="page">{item.name}</span>
              ) : (
                <>
                  <Link href={item.path}>{item.name}</Link>
                  <span aria-hidden="true">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

import { forwardRef } from "react";
import type { AnchorHTMLAttributes } from "react";
import { VisuallyHidden } from "./VisuallyHidden";

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  external?: boolean;
}

/**
 * Accessible anchor primitive. External links get a safe `rel` and a
 * screen-reader hint instead of relying on visual affordances alone.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, external = false, children, rel, target, className, ...rest },
  ref,
) {
  const classes = ["nero-link", className].filter(Boolean).join(" ");

  if (!external) {
    return (
      <a ref={ref} href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <a
      ref={ref}
      href={href}
      className={classes}
      target={target ?? "_blank"}
      rel={rel ?? "noopener noreferrer"}
      {...rest}
    >
      {children}
      <span className="nero-link__external-hint" aria-hidden="true">
        {" "}
        ↗
      </span>
      <VisuallyHidden> (opens in a new tab)</VisuallyHidden>
    </a>
  );
});

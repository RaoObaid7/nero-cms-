import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT_CLASS_NAME: Record<ButtonVariant, string> = {
  primary: "nero-button nero-button--primary",
  secondary: "nero-button nero-button--secondary",
  danger: "nero-button nero-button--danger",
};

/**
 * Accessible button primitive. Renders a native `<button>` so keyboard and
 * screen-reader semantics come for free; callers only choose a visual variant.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", type = "button", className, disabled, ...rest },
  ref,
) {
  const classes = [VARIANT_CLASS_NAME[variant], className].filter(Boolean).join(" ");

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      {...rest}
    />
  );
});

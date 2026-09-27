export type CalloutVariant = "quote" | "info";

export interface CalloutProps {
  variant: CalloutVariant;
  text: string;
  attribution?: string;
}

export function Callout({ variant, text, attribution }: CalloutProps) {
  if (variant === "quote") {
    return (
      <blockquote className="nero-block nero-block--callout nero-block--quote">
        <p>{text}</p>
        {attribution ? <cite>{attribution}</cite> : null}
      </blockquote>
    );
  }

  return (
    <aside className="nero-block nero-block--callout nero-block--info" role="note">
      <p>{text}</p>
    </aside>
  );
}

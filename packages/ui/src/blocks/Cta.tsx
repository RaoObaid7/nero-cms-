import { Link } from "../components/Link";

export interface CtaAction {
  label: string;
  href: string;
}

export interface CtaProps {
  heading: string;
  body?: string;
  actions: CtaAction[];
}

export function Cta({ heading, body, actions }: CtaProps) {
  return (
    <section className="nero-block nero-block--cta">
      <h2>{heading}</h2>
      {body ? <p>{body}</p> : null}
      <div className="nero-block__actions">
        {actions.map((action, index) => (
          <Link key={index} href={action.href}>
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

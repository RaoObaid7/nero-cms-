import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Callout, ContentCards, Cta, Faq, Gallery, Hero, ImageText, RichText } from "../blocks";

describe("block presentational primitives", () => {
  it("Hero renders an H2 heading, not an H1 — templates own the page H1", () => {
    render(<Hero heading="Travel with confidence" cta={{ label: "Explore", href: "/packages" }} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Travel with confidence" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore" })).toHaveAttribute("href", "/packages");
  });

  it("RichText renders pre-converted HTML", () => {
    render(<RichText html="<p>Hello world</p>" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("ImageText renders the layout variant as a class and the image alt text", () => {
    const { container } = render(
      <ImageText
        layout="imageRight"
        html="<p>Copy</p>"
        media={{ url: "/a.jpg", alt: "A photo" }}
      />,
    );
    expect(container.querySelector(".nero-block--imageRight")).not.toBeNull();
    expect(screen.getByAltText("A photo")).toBeInTheDocument();
  });

  it("Gallery renders one item per image with captions", () => {
    render(
      <Gallery
        images={[
          { media: { url: "/1.jpg" }, caption: "First" },
          { media: { url: "/2.jpg" }, caption: "Second" },
        ]}
      />,
    );
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("Callout renders a blockquote for the quote variant and an aside for info", () => {
    const { rerender } = render(
      <Callout variant="quote" text="Great trip" attribution="A traveler" />,
    );
    expect(screen.getByText("Great trip").closest("blockquote")).not.toBeNull();

    rerender(<Callout variant="info" text="Heads up" />);
    expect(screen.getByRole("note")).toHaveTextContent("Heads up");
  });

  it("ContentCards links each card title when an href is present", () => {
    render(<ContentCards cards={[{ title: "Hajj", href: "/hajj" }, { title: "Umrah" }]} />);
    expect(screen.getByRole("link", { name: "Hajj" })).toHaveAttribute("href", "/hajj");
    expect(screen.getByText("Umrah").tagName).toBe("H3");
  });

  it("Faq renders a question/answer pair per item", () => {
    render(<Faq items={[{ question: "Is it safe?", answer: "Yes." }]} />);
    expect(screen.getByText("Is it safe?")).toBeInTheDocument();
    expect(screen.getByText("Yes.")).toBeInTheDocument();
  });

  it("Cta renders one to two action links", () => {
    render(
      <Cta
        heading="Ready?"
        actions={[
          { label: "Contact us", href: "/contact" },
          { label: "See packages", href: "/packages" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Contact us" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See packages" })).toBeInTheDocument();
  });
});

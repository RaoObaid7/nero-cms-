"use client";

import * as React from "react";
import { motion } from "framer-motion";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FAQItem {
  id: number | string;
  question: string;
  answer: string;
  icon?: string;
  iconPosition?: "left" | "right";
}

export interface ScrollFAQAccordionProps {
  data?: FAQItem[];
  className?: string;
  questionClassName?: string;
  answerClassName?: string;
  title?: string;
  subtitle?: string;
  contactEmail?: string;
  badgeText?: string;
  enableScrollTrigger?: boolean;
}

export const defaultFaqData: FAQItem[] = [
  {
    id: 1,
    question: "What is blockus?",
    answer:
      "Blockus is a curated collection of beautiful, responsive, and customizable UI components built for modern web applications.",
  },
  {
    id: 2,
    question: "How do I install a block?",
    answer:
      "Simply browse the collection, copy the code directly into your components folder, and install any required dependencies listed in the component docs.",
  },
  {
    id: 3,
    question: "Do I need a Pro account?",
    answer:
      "No! All open components are completely free and open-source under the MIT license for both personal and commercial projects.",
  },
];

export default function ScrollFAQAccordion({
  data = defaultFaqData,
  className,
  questionClassName,
  answerClassName,
  title = "Frequently asked questions",
  subtitle = "Quick answers to the questions we get the most.",
  contactEmail = "support@tuyba.com",
  badgeText = "FAQ",
}: ScrollFAQAccordionProps) {
  const [openItem, setOpenItem] = React.useState<string | null>(
    data.length > 0 && data[0] ? data[0].id.toString() : null,
  );

  return (
    <section
      className={cn("ty-faq-section w-full max-w-3xl mx-auto py-12 px-4", className)}
      style={{ maxWidth: "48rem", marginInline: "auto", padding: "3rem 1rem" }}
    >
      {/* Pill Badge */}
      <div
        className="ty-faq-badge-wrapper flex justify-center mb-4"
        style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}
      >
        <span
          className="ty-faq-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300/80 shadow-2xs"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.25rem 0.75rem",
            borderRadius: "9999px",
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            color: "#b45309",
            fontSize: "0.75rem",
            fontWeight: 600,
          }}
        >
          <Hash className="h-3 w-3 stroke-[2.5]" style={{ width: "0.75rem", height: "0.75rem" }} />
          {badgeText}
        </span>
      </div>

      {/* Main Heading */}
      {title && (
        <h2
          className="ty-faq-title text-3xl sm:text-4xl font-bold text-center text-slate-900 tracking-tight mb-2"
          style={{
            fontSize: "2.25rem",
            fontWeight: 700,
            textAlign: "center",
            color: "#0f172a",
            letterSpacing: "-0.025em",
            marginBottom: "0.5rem",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h2>
      )}

      {/* Subtitles */}
      {subtitle && (
        <p
          className="ty-faq-subtitle text-center text-slate-600 text-sm sm:text-base mb-1"
          style={{
            textAlign: "center",
            color: "#64748b",
            fontSize: "1rem",
            marginBottom: "0.25rem",
          }}
        >
          {subtitle}
        </p>
      )}

      {contactEmail && (
        <p
          className="ty-faq-subcontact text-center text-slate-500 text-xs sm:text-sm mb-10"
          style={{
            textAlign: "center",
            color: "#94a3b8",
            fontSize: "0.875rem",
            marginBottom: "2.5rem",
          }}
        >
          Can&apos;t find yours? Write to{" "}
          <a
            href={`mailto:${contactEmail}`}
            className="font-medium text-slate-800 underline underline-offset-2 hover:text-emerald-700 transition-colors"
            style={{
              color: "#0f172a",
              fontWeight: 600,
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            {contactEmail}
          </a>
        </p>
      )}

      {/* Accordion List with Clean Horizontal Dividers */}
      <Accordion.Root
        type="single"
        collapsible
        value={openItem || ""}
        onValueChange={(val) => setOpenItem(val || null)}
        className="ty-faq-list w-full border-t border-slate-200"
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          borderTop: "1px solid #e2e8f0",
        }}
      >
        {data.map((item) => {
          const isOpen = openItem === item.id.toString();

          return (
            <Accordion.Item
              value={item.id.toString()}
              key={item.id}
              className="ty-faq-item border-b border-slate-200"
              style={{ borderBottom: "1px solid #e2e8f0" }}
            >
              <Accordion.Header className="m-0 p-0">
                <Accordion.Trigger
                  className="ty-faq-trigger flex w-full items-center justify-between py-5 text-left cursor-pointer transition-colors focus:outline-hidden group"
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "1.25rem 0",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    gap: "1rem",
                  }}
                >
                  <span
                    className={cn(
                      "ty-faq-question text-base sm:text-lg font-medium text-slate-900 group-hover:text-emerald-700 transition-colors",
                      questionClassName,
                    )}
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: 500,
                      color: isOpen ? "#059669" : "#0f172a",
                      lineHeight: 1.4,
                      transition: "color 0.15s ease",
                    }}
                  >
                    {item.question}
                  </span>

                  <ChevronDown
                    className={cn(
                      "ty-faq-icon h-5 w-5 text-slate-400 shrink-0 transition-transform duration-200 group-hover:text-slate-600",
                      isOpen && "rotate-180 text-emerald-700",
                    )}
                    style={{
                      width: "1.25rem",
                      height: "1.25rem",
                      flexShrink: 0,
                      color: isOpen ? "#059669" : "#94a3b8",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), color 0.15s ease",
                    }}
                    aria-hidden="true"
                  />
                </Accordion.Trigger>
              </Accordion.Header>

              <Accordion.Content asChild forceMount>
                <motion.div
                  initial="collapsed"
                  animate={isOpen ? "open" : "collapsed"}
                  variants={{
                    open: { opacity: 1, height: "auto" },
                    collapsed: { opacity: 0, height: 0 },
                  }}
                  transition={{ duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] }}
                  className="overflow-hidden"
                  style={{ overflow: "hidden" }}
                >
                  <div
                    className={cn(
                      "ty-faq-answer text-slate-600 text-sm sm:text-base leading-relaxed pb-5 pr-8",
                      answerClassName,
                    )}
                    style={{
                      color: "#475569",
                      fontSize: "0.95rem",
                      lineHeight: 1.65,
                      paddingBottom: "1.25rem",
                      paddingRight: "1.5rem",
                    }}
                  >
                    {item.answer}
                  </div>
                </motion.div>
              </Accordion.Content>
            </Accordion.Item>
          );
        })}
      </Accordion.Root>
    </section>
  );
}

export { ScrollFAQAccordion };

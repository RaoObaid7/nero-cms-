import type { Block } from "payload";

export const FAQ_BLOCK_SLUG = "faq";

export const FaqBlock: Block = {
  slug: FAQ_BLOCK_SLUG,
  interfaceName: "FaqBlock",
  labels: { singular: "FAQ", plural: "FAQs" },
  custom: {
    description: "A list of question/answer pairs.",
  },
  fields: [
    {
      name: "items",
      type: "array",
      required: true,
      minRows: 1,
      labels: { singular: "Question", plural: "Questions" },
      fields: [
        { name: "question", type: "text", required: true },
        { name: "answer", type: "textarea", required: true },
      ],
    },
  ],
};

export const faqFixture = {
  blockType: FAQ_BLOCK_SLUG,
  items: [
    {
      question: "Is the itinerary Islamic-compliant?",
      answer: "Yes, every package is reviewed against our compliance checklist.",
    },
    {
      question: "Can I change my travel dates?",
      answer: "Yes, subject to the supplier's change policy.",
    },
  ],
};

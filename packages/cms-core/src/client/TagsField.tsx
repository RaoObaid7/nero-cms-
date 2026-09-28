"use client";

import { useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { FieldDescription, FieldLabel, TextInput, useField } from "@payloadcms/ui";
import type { TextFieldClientProps } from "payload";

export type TagsFieldClientProps = TextFieldClientProps;

function parseTags(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function serializeTags(tags: string[]): string {
  const seen = new Set<string>();
  return tags
    .map((tag) => tag.trim())
    .filter((tag) => {
      const normalized = tag.toLocaleLowerCase();
      if (!tag || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .join(", ");
}

export function TagsField({ field, path: pathProp }: TagsFieldClientProps) {
  const path = pathProp || field.name;
  const { value, setValue, showError } = useField<string>({ path });
  const [draft, setDraft] = useState("");
  const tags = parseTags(value);

  function addTags(rawValue: string): void {
    const nextTags = [...tags, ...parseTags(rawValue)];
    setValue(serializeTags(nextTags));
    setDraft("");
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const inputValue = event.target.value;
    if (inputValue.includes(",")) {
      const pieces = inputValue.split(",");
      addTags(pieces.slice(0, -1).join(","));
      setDraft(pieces.at(-1)?.trimStart() ?? "");
      return;
    }
    setDraft(inputValue);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTags(draft);
    } else if (event.key === "Backspace" && !draft && tags.length > 0) {
      setValue(serializeTags(tags.slice(0, -1)));
    }
  }

  function removeTag(tagToRemove: string): void {
    setValue(serializeTags(tags.filter((tag) => tag !== tagToRemove)));
  }

  return (
    <div className="field-type text">
      <FieldLabel htmlFor={`field-${path}`} label={field.label} required={field.required} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.5rem" }}>
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              border: "1px solid var(--theme-elevation-250)",
              borderRadius: "3px",
              padding: "0.2rem 0.4rem",
            }}
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag} tag`}
              onClick={() => removeTag(tag)}
              style={{ border: 0, background: "transparent", cursor: "pointer", padding: 0 }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <TextInput
        path={path}
        value={draft}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        showError={showError}
      />
      <FieldDescription description="Type a tag and press Enter to add it." path={path} />
    </div>
  );
}

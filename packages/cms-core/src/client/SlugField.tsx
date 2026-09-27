"use client";

import { useEffect, useRef } from "react";
import type { ChangeEvent } from "react";
import { FieldDescription, FieldLabel, TextInput, useField, useFormFields } from "@payloadcms/ui";
import { slugify } from "payload/shared";
import type { TextFieldClientProps } from "payload";

export interface SlugFieldClientProps extends TextFieldClientProps {
  /** Top-level form path of the field to derive the slug from. Defaults to `title`. */
  titleFieldPath?: string;
}

/**
 * Reusable WordPress-style slug auto-fill (PRD §6 "Editor experience
 * baseline: WordPress familiarity"): fills live as the title field is typed,
 * stays directly editable, and stops auto-syncing once the editor edits the
 * slug manually or the document has been (or becomes, in this session)
 * published — so a published URL never shifts under an editor's feet.
 *
 * The "manual edit" stop condition is detected by comparing the slug field's
 * current value against the last value *this component* wrote: as long as
 * they match, the slug is still "following" the title, so it's safe to keep
 * syncing. The moment they diverge — the editor typed directly into the
 * slug field — syncing stops for the rest of the session. This mirrors
 * WordPress's own behavior (the permalink live-updates on a new post, but
 * stops the moment you edit it directly or the post is published) without
 * needing a separate persisted flag.
 */
export function SlugField(props: SlugFieldClientProps) {
  const { field, path: pathProp, titleFieldPath = "title" } = props;
  const path = pathProp || field.name;
  const { value, setValue, showError } = useField<string>({ path });

  const titleValue = useFormFields(
    ([fields]) => fields[titleFieldPath]?.value as string | undefined,
  );
  const statusValue = useFormFields(([fields]) => fields._status?.value as string | undefined);
  const initialStatus = useFormFields(
    ([fields]) => fields._status?.initialValue as string | undefined,
  );

  // Once true, this component never writes to the slug field again this session.
  const lockedRef = useRef(initialStatus === "published");
  // The last value *we* wrote — used to tell "still following the title" apart from "the editor changed it".
  const lastAutoRef = useRef<string | undefined>(value);
  // Effects below only react to *changes*, not the field's initial value at mount.
  const previousTitleRef = useRef(titleValue);

  useEffect(() => {
    if (statusValue === "published") lockedRef.current = true;
  }, [statusValue]);

  useEffect(() => {
    const titleChanged = titleValue !== previousTitleRef.current;
    previousTitleRef.current = titleValue;
    if (!titleChanged) return;
    if (lockedRef.current) return;
    if (titleValue === undefined) return;

    const nextSlug = slugify(titleValue);
    const stillInSync = !value || value === lastAutoRef.current;
    if (!stillInSync) {
      lockedRef.current = true;
      return;
    }
    lastAutoRef.current = nextSlug;
    if (value !== nextSlug) setValue(nextSlug);
    // Only the title's value should re-trigger this sync; `value`/`setValue`
    // changing as a *result* of this effect must not re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleValue]);

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    lockedRef.current = true;
    setValue(event.target.value);
  }

  return (
    <div className="field-type text nero-slug-field">
      <FieldLabel htmlFor={`field-${path}`} label={field.label} required={field.required} />
      <TextInput
        path={path}
        value={value ?? ""}
        onChange={handleChange}
        showError={showError}
        required={field.required}
      />
      <FieldDescription
        description="Fills in automatically from the title as you type. Edit it directly to set a custom URL — once you do, it stops following the title. It also stops updating once the page is published, so live links never break."
        path={path}
      />
    </div>
  );
}

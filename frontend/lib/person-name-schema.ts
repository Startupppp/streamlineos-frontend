import { z } from "zod";

const HAS_LETTER = /\p{L}/u;
const NAME_SHAPE = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
const CONSECUTIVE_SPACES = /\s{2}/;

export const PERSON_NAME_MAX = 200;

export const personNameSchema = z
  .string()
  .trim()
  .min(2, "Enter a valid name")
  .max(PERSON_NAME_MAX, `Name must be at most ${PERSON_NAME_MAX} characters`)
  .refine((value) => HAS_LETTER.test(value), "Enter a valid name")
  .refine(
    (value) => NAME_SHAPE.test(value),
    "Use only letters, spaces, apostrophes, hyphens and periods",
  )
  .refine(
    (value) => !CONSECUTIVE_SPACES.test(value),
    "Remove the extra spaces from this name",
  );

const HR_NAME_HAS_MARKUP = /[<>]/;
const HR_NAME_HAS_DIGIT = /\p{N}/u;
const HR_NAME_SHAPE = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;

export const HR_PERSON_NAME_MAX = 100;

export const HR_PERSON_NAME_HINT = "Letters, spaces, apostrophes, periods and hyphens. No numbers.";

export function hrPersonNameField(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(HR_PERSON_NAME_MAX, `${label} must be at most ${HR_PERSON_NAME_MAX} characters`)
    .refine((v) => !HR_NAME_HAS_MARKUP.test(v), {
      message: "Angle brackets are not allowed in names",
      abort: true,
    })
    .refine(
      (v) => v.length === 0 || !HR_NAME_HAS_DIGIT.test(v),
      "Numbers are not allowed in names",
    )
    .refine(
      (v) => v.length === 0 || HR_NAME_SHAPE.test(v),
      "Names can contain letters, spaces, apostrophes, periods and hyphens",
    );
}

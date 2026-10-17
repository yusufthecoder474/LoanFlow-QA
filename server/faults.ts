const supported = [
  "ui-status",
  "invalid-ratio",
  "approval-not-persisted",
  "duplicate-review",
  "record-leak",
  "response-field",
  "missing-document",
  "officer-scope",
];
const selected = process.env.FAULT ?? "";
if (
  selected &&
  (process.env.ENABLE_FAULTS !== "true" ||
    process.env.NODE_ENV === "production")
)
  throw new Error("Faults require explicit local experiment opt-in");
if (selected && !supported.includes(selected)) throw new Error("Unknown fault");
export const fault = (name: string) => selected === name;

import { Document, parseDocument } from "yaml";
import { sortFields } from "./field-sorter.js";

export function formatYaml(input: string): string {
  const doc = parseDocument(input);
  const data = doc.toJSON() as Record<string, unknown>;
  const sorted = sortFields(data);

  const newDoc = new Document(sorted);
  return newDoc.toString({
    lineWidth: 100,
    defaultKeyType: "PLAIN",
    defaultStringType: "PLAIN",
  });
}

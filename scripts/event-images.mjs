import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const data = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../shared/demo-event-images.json"),
    "utf8",
  ),
);

export function imageForEvent(title, category) {
  return data.by_title[title] ?? data.by_category[category] ?? data.default;
}

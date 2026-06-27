import { collection, getDocs } from "firebase/firestore";

import { getFirebaseDb, isFirebaseConfigured } from "./firebase";
import type { DiscoverEvent } from "./types";

function mapSeedEvent(id: string, data: Record<string, unknown>): DiscoverEvent | null {
  const title = data.title;
  const lat = data.lat;
  const lng = data.lng;
  if (typeof title !== "string" || typeof lat !== "number" || typeof lng !== "number") {
    return null;
  }

  return {
    id,
    title,
    description: typeof data.description === "string" ? data.description : "",
    category: typeof data.category === "string" ? data.category : "Local event",
    image_url: typeof data.image_url === "string" ? data.image_url : "",
    price_estimate:
      typeof data.price_estimate === "number" ? data.price_estimate : null,
    price_label:
      typeof data.price_label === "string" ? data.price_label : "See details",
    location: typeof data.location === "string" ? data.location : "",
    lat,
    lng,
    url: typeof data.url === "string" ? data.url : "",
    date_hint: typeof data.date_hint === "string" ? data.date_hint : null,
    passed_rules: Array.isArray(data.passed_rules)
      ? data.passed_rules.filter((rule): rule is string => typeof rule === "string")
      : undefined,
    prometheux_verified: data.prometheux_verified === true,
    filter_method: data.filter_method === "sdk" ? "sdk" : null,
    match_score: typeof data.match_score === "number" ? data.match_score : null,
  };
}

export async function loadSeedEvents(uid: string): Promise<DiscoverEvent[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDocs(
    collection(getFirebaseDb(), "users", uid, "events"),
  );

  return snapshot.docs
    .map((doc) => mapSeedEvent(doc.id, doc.data() as Record<string, unknown>))
    .filter((event): event is DiscoverEvent => event !== null);
}

export function mergeDiscoverEvents(
  seeded: DiscoverEvent[],
  discovered: DiscoverEvent[],
): DiscoverEvent[] {
  const byId = new Map<string, DiscoverEvent>();
  for (const event of discovered) {
    byId.set(event.id, event);
  }
  for (const event of seeded) {
    byId.set(event.id, event);
  }
  return Array.from(byId.values());
}

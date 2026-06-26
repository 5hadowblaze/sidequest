#!/usr/bin/env node
/**
 * Seed demo events + profile for a Firebase Auth user.
 *
 * Usage (from repo root):
 *   cd scripts && npm install && node seed-demo-events.mjs
 *
 * Requires: npx firebase-tools@latest login (Application Default Credentials)
 */

import { createHash } from "node:crypto";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { imageForEvent } from "./event-images.mjs";

const PROJECT_ID = "perfect-weekend-planner";
const USER_EMAIL = "dzakwan1844@gmail.com";
const USER_UID = "Ow7fAnACNZcyQ6KpUwyMaKcCK9w1";

const HOME_CITY = "London, UK";
const CENTER = { lat: 51.5074, lng: -0.1278 };

const CATEGORIES = [
  "Festival",
  "Concert",
  "Market",
  "Popup",
  "Art",
  "Food & drink",
  "Meetup",
  "Pub hangout",
  "Tech",
  "Sports",
  "Nightlife",
  "Workshop",
];

const EVENT_TEMPLATES = [
  ["Rooftop Jazz & Wine Popup", "Popup", "Sunset live jazz with natural wine pairings on a Shoreditch rooftop."],
  ["Borough Market Weekend Tasting Trail", "Market", "Guided bites through London's oldest food market — this Saturday."],
  ["Southbank Film & Picnic Night", "Festival", "Open-air screenings and deckchair seating along the Thames."],
  ["Hackney Makers Fair", "Market", "Ceramics, prints, and indie brands in a warehouse pop-up."],
  ["Camden Live Sessions", "Concert", "Three-band lineup at an intimate venue — doors at 7pm."],
  ["Notting Hill Gallery Crawl", "Art", "Opening night across five galleries within walking distance."],
  ["Brick Lane Night Market", "Market", "Late-night street food, vintage finds, and DJ sets."],
  ["Regent's Canal Kayak Social", "Sports", "Beginner-friendly paddle followed by riverside drinks."],
  ["Covent Garden Comedy Loft", "Nightlife", "Stand-up showcase with rising local comics."],
  ["King's Cross Tech Meetup", "Tech", "Lightning talks, demos, and hallway track for builders."],
  ["Columbia Road Flower Morning", "Festival", "Early-bird flower market with coffee pop-ups."],
  ["Peckham Rooftop Cinema", "Popup", "Classic films under the stars with blanket bundles."],
  ["Soho Vinyl Listening Party", "Concert", "Curated crate-digging session and live DJ set."],
  ["Greenwich Park Yoga & Brunch", "Workshop", "Outdoor flow class followed by a vegan brunch pop-up."],
  ["Spitalfields Design Pop-Up", "Popup", "Limited-run homeware and fashion from London studios."],
  ["Richmond Riverside Food Fest", "Festival", "Street food trucks, craft beer, and family activities."],
  ["Dalston Supper Club", "Food & drink", "Chef's table tasting menu in a hidden railway arch."],
  ["Clapham Common Run Club Social", "Sports", "5K group run ending at a pub with guest speakers."],
  ["Shoreditch Street Art Walk", "Art", "Guided mural tour with artist Q&A this Sunday."],
  ["Leicester Square Indie Film Premiere", "Festival", "World premiere screening with cast meet-and-greet."],
  ["Canary Wharf Jazz Brunch", "Concert", "Live quartet and bottomless brunch on the waterfront."],
  ["Brixton Village Record Fair", "Market", "Vinyl dealers, live sets, and rare pressings all weekend."],
  ["Hampstead Heath Stargazing", "Meetup", "Telescope viewing and hot chocolate at dusk."],
  ["London Fields Brewery Tour", "Pub hangout", "Tank-room tour with guided tasting flight."],
  ["Angel Bookshop Poetry Night", "Meetup", "Open mic and featured poets in a cozy independent shop."],
  ["Waterloo Improv Jam", "Nightlife", "Drop-in improv workshop open to all skill levels."],
  ["Stratford Olympic Park Fun Run", "Sports", "Community 10K with medal and food village."],
  ["Marylebone Farmers Market", "Market", "Seasonal produce, artisan cheese, and live acoustic sets."],
  ["Whitechapel Gallery Late", "Art", "Extended hours, curator tours, and DJ after dark."],
  ["Elephant & Castle Latin Night", "Nightlife", "Salsa lessons followed by live band and dancing."],
  ["Kensington Science Pop-Up Lab", "Workshop", "Hands-on experiments for adults — tickets from £12."],
  ["Deptford Creek Low-Tide Walk", "Meetup", "Guided urban nature walk at low tide — wellies recommended."],
  ["Islington Gin Distillery Tour", "Food & drink", "Behind-the-scenes tour with botanical tasting."],
  ["Wembley Stadium Tour + Fan Zone", "Sports", "Pitch-side access and interactive fan experiences."],
  ["Holborn Chess & Coffee Social", "Meetup", "Casual blitz games in a specialty coffee shop."],
  ["Tower Bridge Sunrise Photography", "Workshop", "Golden-hour shoot with pro tips and small group."],
  ["Chelsea Physic Garden Herb Workshop", "Workshop", "Make-your-own tinctures from garden-grown herbs."],
  ["Ladbroke Grove Carnival Warm-Up", "Festival", "Sound-system preview party ahead of the main parade."],
  ["Finsbury Park Outdoor HIIT", "Sports", "Free community workout followed by smoothie bar."],
  ["Bankside Shakespeare Pop-Up", "Festival", "Short scenes performed in pub courtyards — pay what you can."],
  ["Old Street UX Portfolio Review", "Tech", "Peer feedback circle for designers and PMs."],
  ["Victoria Park Picnic Orchestra", "Concert", "String ensemble playing classics in the park bandstand."],
  ["Rotherhithe Thames Path Pub Crawl", "Pub hangout", "Four historic pubs along the river — guided route."],
  ["Chiswick House Tulip Festival", "Festival", "Thousands of tulips, garden trails, and family crafts."],
  ["Euston Vegan Street Feast", "Food & drink", "Plant-based vendors, cooking demos, and zero-waste talks."],
  ["London Bridge Ghost Walk", "Meetup", "Spooky history tour ending at a hidden speakeasy."],
  ["West End Silent Disco", "Nightlife", "Three-channel headphones dance party in a secret location."],
  ["Hoxton Ceramics Throwing Class", "Workshop", "Two-hour wheel session — take home your best piece."],
  ["St Paul's Cathedral Organ Recital", "Concert", "Evening recital in the nave — limited seats."],
  ["Little Venice Canal Boat Jazz", "Concert", "Acoustic jazz aboard a narrowboat — BYO snacks."],
];

function jitter(seed, index) {
  const digest = createHash("sha256").update(`${seed}-${index}`).digest("hex");
  const latJ = (parseInt(digest.slice(0, 4), 16) / 65535 - 0.5) * 0.12;
  const lngJ = (parseInt(digest.slice(4, 8), 16) / 65535 - 0.5) * 0.16;
  return {
    lat: CENTER.lat + latJ,
    lng: CENTER.lng + lngJ,
  };
}

function priceFor(index) {
  if (index % 7 === 0) return { price_estimate: 0, price_label: "Free" };
  if (index % 5 === 0) return { price_estimate: 12, price_label: "From £12" };
  if (index % 3 === 0) return { price_estimate: 25, price_label: "From £25" };
  return { price_estimate: 18, price_label: "From £18" };
}

function buildEvents() {
  return EVENT_TEMPLATES.map(([title, category, description], index) => {
    const id = `seed_${String(index + 1).padStart(3, "0")}`;
    const coords = jitter(id, index);
    const price = priceFor(index);
    return {
      id,
      title,
      description,
      category,
      image_url: imageForEvent(title, category),
      price_estimate: price.price_estimate,
      price_label: price.price_label,
      location: HOME_CITY,
      lat: coords.lat,
      lng: coords.lng,
      url: `https://lu.ma/demo-${id}`,
      date_hint: index % 2 === 0 ? "This Saturday" : "This Sunday",
      passed_rules: ["budget_ok", "loc_ok", "activity_match"],
      prometheux_verified: true,
      filter_method: "sdk",
      match_score: 3,
      seeded: true,
    };
  });
}

async function main() {
  initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
  });

  const db = getFirestore();
  const userRef = db.collection("users").doc(USER_UID);
  const events = buildEvents();

  console.log(`Seeding ${events.length} events for ${USER_EMAIL} (${USER_UID})…`);

  await userRef.set(
    {
      uid: USER_UID,
      homeCity: HOME_CITY,
      budget: 200,
      diet: "no restrictions",
      activities: "music, food, art, pop-ups, nightlife, markets, comedy",
      accessibility: "",
      onboardingCompleted: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const batchSize = 400;
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = db.batch();
    for (const event of events.slice(i, i + batchSize)) {
      const { id, ...payload } = event;
      batch.set(userRef.collection("events").doc(id), payload);
    }
    await batch.commit();
  }

  console.log(`Done. Profile + ${events.length} events near ${HOME_CITY}.`);
}

main().catch((error) => {
  console.error("Seed failed:", error.message);
  console.error("Run: npx -y firebase-tools@latest login");
  process.exit(1);
});

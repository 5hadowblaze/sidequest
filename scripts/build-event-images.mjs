#!/usr/bin/env node
/**
 * Download demo event photos locally and regenerate shared/demo-event-images.json.
 * Run: node scripts/build-event-images.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const imagesDir = join(root, "frontend/public/images/events");
const outPath = join(root, "shared/demo-event-images.json");

const pexelsSource = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=640&h=400&fit=crop`;

const local = (slug) => `/images/events/${slug}.jpg`;

/** Unique slug -> Pexels photo id */
const assets = {
  "festival-crowd": 1105666,
  "concert-live": 1763075,
  "farmers-market": 1190297,
  "popup-shop": 5632402,
  "art-gallery": 2774556,
  "food-dining": 941861,
  "meetup-group": 3184418,
  "pub-interior": 274192,
  "tech-meetup": 3861969,
  "running-sport": 248547,
  "nightlife-dance": 2747449,
  "craft-workshop": 256262,
  "conference-room": 1181396,
  "travel-scenic": 2387873,
  "jazz-performance": 167092,
  "outdoor-cinema": 7991579,
  "street-food-night": 2255935,
  "kayak-canal": 442584,
  "comedy-stage": 713149,
  "flower-market": 931162,
  "vinyl-records": 1389424,
  "yoga-outdoor": 3822621,
  "design-popup": 2983468,
  "food-festival": 674574,
  "fine-dining": 1640777,
  "street-art": 1194420,
  "stargazing": 1257860,
  "craft-beer": 1552630,
  "bookshop": 256450,
  "marathon": 2803159,
  "museum-night": 1191710,
  "science-lab": 4145353,
  "nature-walk": 1687845,
  "cocktail-bar": 1307698,
  "stadium": 274597,
  "coffee-shop": 1181519,
  "london-bridge": 460672,
  "garden-flowers": 931165,
  "fitness-outdoor": 863988,
  "ux-design": 270348,
  "orchestra-park": 210922,
  "pub-exterior": 1283219,
  "tulips": 931177,
  "vegan-food": 696218,
  "london-night": 460621,
  "silent-disco": 791753,
  "pottery": 256541,
  "cathedral": 460677,
  "swimming-pool": 1632368,
  "brunch": 1267320,
  "fireworks": 1387037,
  "river-cruise": 209977,
};

function asset(slug) {
  if (!assets[slug]) throw new Error(`Unknown asset slug: ${slug}`);
  return local(slug);
}

const byCategory = {
  Festival: asset("festival-crowd"),
  Concert: asset("concert-live"),
  Market: asset("farmers-market"),
  Popup: asset("popup-shop"),
  Art: asset("art-gallery"),
  "Food & drink": asset("food-dining"),
  Meetup: asset("meetup-group"),
  "Pub hangout": asset("pub-interior"),
  Tech: asset("tech-meetup"),
  Sports: asset("running-sport"),
  Nightlife: asset("nightlife-dance"),
  Workshop: asset("craft-workshop"),
  Conference: asset("conference-room"),
  Travel: asset("travel-scenic"),
  "Local event": asset("concert-live"),
};

const byTitle = {
  "Rooftop Jazz & Wine Popup": asset("jazz-performance"),
  "Borough Market Weekend Tasting Trail": asset("farmers-market"),
  "Southbank Film & Picnic Night": asset("outdoor-cinema"),
  "Hackney Makers Fair": asset("craft-workshop"),
  "Camden Live Sessions": asset("concert-live"),
  "Notting Hill Gallery Crawl": asset("art-gallery"),
  "Brick Lane Night Market": asset("street-food-night"),
  "Regent's Canal Kayak Social": asset("kayak-canal"),
  "Covent Garden Comedy Loft": asset("comedy-stage"),
  "King's Cross Tech Meetup": asset("tech-meetup"),
  "Columbia Road Flower Morning": asset("flower-market"),
  "Peckham Rooftop Cinema": asset("outdoor-cinema"),
  "Soho Vinyl Listening Party": asset("vinyl-records"),
  "Greenwich Park Yoga & Brunch": asset("yoga-outdoor"),
  "Spitalfields Design Pop-Up": asset("design-popup"),
  "Richmond Riverside Food Fest": asset("food-festival"),
  "Dalston Supper Club": asset("fine-dining"),
  "Clapham Common Run Club Social": asset("running-sport"),
  "Shoreditch Street Art Walk": asset("street-art"),
  "Leicester Square Indie Film Premiere": asset("outdoor-cinema"),
  "Canary Wharf Jazz Brunch": asset("jazz-performance"),
  "Brixton Village Record Fair": asset("vinyl-records"),
  "Hampstead Heath Stargazing": asset("stargazing"),
  "London Fields Brewery Tour": asset("craft-beer"),
  "Angel Bookshop Poetry Night": asset("bookshop"),
  "Waterloo Improv Jam": asset("comedy-stage"),
  "Stratford Olympic Park Fun Run": asset("marathon"),
  "Marylebone Farmers Market": asset("farmers-market"),
  "Whitechapel Gallery Late": asset("museum-night"),
  "Elephant & Castle Latin Night": asset("nightlife-dance"),
  "Kensington Science Pop-Up Lab": asset("science-lab"),
  "Deptford Creek Low-Tide Walk": asset("nature-walk"),
  "Islington Gin Distillery Tour": asset("cocktail-bar"),
  "Wembley Stadium Tour + Fan Zone": asset("stadium"),
  "Holborn Chess & Coffee Social": asset("coffee-shop"),
  "Tower Bridge Sunrise Photography": asset("london-bridge"),
  "Chelsea Physic Garden Herb Workshop": asset("garden-flowers"),
  "Ladbroke Grove Carnival Warm-Up": asset("festival-crowd"),
  "Finsbury Park Outdoor HIIT": asset("fitness-outdoor"),
  "Bankside Shakespeare Pop-Up": asset("comedy-stage"),
  "Old Street UX Portfolio Review": asset("ux-design"),
  "Victoria Park Picnic Orchestra": asset("orchestra-park"),
  "Rotherhithe Thames Path Pub Crawl": asset("pub-exterior"),
  "Chiswick House Tulip Festival": asset("tulips"),
  "Euston Vegan Street Feast": asset("vegan-food"),
  "London Bridge Ghost Walk": asset("london-night"),
  "West End Silent Disco": asset("silent-disco"),
  "Hoxton Ceramics Throwing Class": asset("pottery"),
  "St Paul's Cathedral Organ Recital": asset("cathedral"),
  "Little Venice Canal Boat Jazz": asset("travel-scenic"),
  "Borough Market Weekend Food Festival": asset("farmers-market"),
  "Shoreditch Vinyl Pop-up Market": asset("vinyl-records"),
  "Southbank Riverside Pub Hangout": asset("pub-interior"),
  "Tech Founders Meetup: AI & Startups": asset("tech-meetup"),
  "Tate Modern Late: Contemporary Art Night": asset("museum-night"),
  "Camden Street Food & Live Music": asset("street-food-night"),
  "Dishoom Sunday Brunch Reservation": asset("brunch"),
  "Hyde Park Outdoor Film Screening": asset("outdoor-cinema"),
  "King's Cross Makers Market": asset("craft-workshop"),
  "Greenwich Day Trip: Thames Clipper & Observatory": asset("london-bridge"),
  "Smorgasburg Williamsburg Food Festival": asset("food-festival"),
  "Chelsea Gallery Hop: New Voices Opening": asset("art-gallery"),
  "Brooklyn Indie Dev Conference": asset("conference-room"),
  "East Village Vegan Food Tour": asset("vegan-food"),
  "Jazz at Lincoln Center Late Set": asset("jazz-performance"),
  "High Line Sunset Pop-up Bar": asset("cocktail-bar"),
  "Central Park Running Club Meetup": asset("running-sport"),
  "MoMA Friday Night Uniqlo Sponsored Entry": asset("museum-night"),
  "Queens Night Market": asset("street-food-night"),
  "Staten Island Ferry & Pizza Day Trip": asset("brunch"),
  "SXSW Side Stage: Local Bands Showcase": asset("concert-live"),
  "Rainey Street Food Truck Rally": asset("food-festival"),
  "East Austin Makers Pop-up": asset("craft-workshop"),
  "Barton Springs Pool Morning Swim Meetup": asset("swimming-pool"),
  "6th Street Pub Crawl: Live Music Route": asset("pub-interior"),
  "Vegan BBQ Pop-up at Mueller Farmers Market": asset("vegan-food"),
  "Austin Tech Brunch: Startup Networking": asset("meetup-group"),
  "Blanton Museum First Sundays": asset("museum-night"),
  "Hill Country Day Trip Shuttle": asset("travel-scenic"),
  "Domain Northside Outdoor Movie Night": asset("outdoor-cinema"),
  "Ferry Building Farmers Market": asset("farmers-market"),
  "Mission District Taco & Art Walk": asset("street-art"),
  "SoMa Tech Meetup: AI Builders Night": asset("tech-meetup"),
  "Golden Gate Park Sunday Picnic Concert": asset("orchestra-park"),
  "Chinatown Night Market Pop-up": asset("street-food-night"),
  "Castro Pub Pride Weekend Hangout": asset("pub-interior"),
  "SFMOMA Free First Thursday": asset("museum-night"),
  "Sausalito Ferry Day Trip": asset("travel-scenic"),
  "Millennium Park Summer Music Series": asset("concert-live"),
  "Wicker Park Art & Vintage Pop-up": asset("popup-shop"),
  "River North Food Hall Weekend Tasting": asset("food-dining"),
  "Lakefront Trail Group Bike Meetup": asset("running-sport"),
  "Green Mill Jazz Club Late Set": asset("jazz-performance"),
  "Navy Pier Fireworks & Festival": asset("fireworks"),
  "Architecture River Cruise Day Trip": asset("river-cruise"),
  "Pike Place Market Chef Demo Weekend": asset("farmers-market"),
  "Capitol Hill Record Store Day Pop-up": asset("vinyl-records"),
  "Fremont Sunday Brewery Tour": asset("craft-beer"),
  "Discovery Park Coastal Hike Meetup": asset("nature-walk"),
  "Chihuly Garden Glass Night Lights": asset("art-gallery"),
  "Ballard Seafood & Music Festival": asset("food-dining"),
  "Bainbridge Island Ferry Day Trip": asset("travel-scenic"),
  "Downtown Weekend Street Festival": asset("festival-crowd"),
  "Rooftop Sunset Pop-up Bar": asset("cocktail-bar"),
  "Indie Makers Market": asset("craft-workshop"),
  "Neighborhood Pub Crawl": asset("pub-interior"),
  "Tech & Coffee Morning Meetup": asset("coffee-shop"),
  "Gallery Opening: New Voices": asset("art-gallery"),
  "Farm-to-Table Brunch Spot": asset("brunch"),
  "Outdoor Film Night in the Park": asset("outdoor-cinema"),
  "Coastal Day Trip Shuttle": asset("travel-scenic"),
  "Community Yoga in the Park": asset("yoga-outdoor"),
  "Local Farm-to-Table Brunch": asset("brunch"),
  "Neighborhood Bistro Dinner": asset("fine-dining"),
};

const data = {
  default: asset("concert-live"),
  by_category: byCategory,
  by_title: byTitle,
};

mkdirSync(imagesDir, { recursive: true });

for (const [slug, id] of Object.entries(assets)) {
  const source = pexelsSource(id);
  const target = join(imagesDir, `${slug}.jpg`);
  const response = await fetch(source);
  if (!response.ok) {
    console.error(`Failed to download ${slug} (${id}): ${response.status}`);
    process.exit(1);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(target, buffer);
  console.log(`Saved ${slug}.jpg`);
}

writeFileSync(outPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${outPath}`);

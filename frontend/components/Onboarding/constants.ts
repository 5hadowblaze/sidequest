export const CITY_CHIPS = [
  { label: "London", emoji: "🇬🇧" },
  { label: "NYC", emoji: "🗽" },
  { label: "Austin", emoji: "🤠" },
  { label: "Berlin", emoji: "🇩🇪" },
  { label: "Tokyo", emoji: "🗼" },
  { label: "Paris", emoji: "🥐" },
  { label: "Lisbon", emoji: "☀️" },
  { label: "Chicago", emoji: "🌬️" },
] as const;

export const BUDGET_TIERS = [
  { value: 50, label: "£50", tagline: "Picnic era" },
  { value: 100, label: "£100", tagline: "Treat yourself" },
  { value: 150, label: "£150", tagline: "Main character" },
  { value: 200, label: "£200", tagline: "No notes" },
  { value: 999, label: "YOLO", tagline: "Money is fake" },
] as const;

export const DIET_OPTIONS = [
  { label: "No restrictions", emoji: "🍽️" },
  { label: "Vegan", emoji: "🌱" },
  { label: "Vegetarian", emoji: "🥗" },
  { label: "Halal", emoji: "☪️" },
  { label: "Kosher", emoji: "✡️" },
  { label: "Gluten-free", emoji: "🌾" },
  { label: "Nut-free", emoji: "🥜" },
  { label: "Pescatarian", emoji: "🐟" },
] as const;

export const ACTIVITY_OPTIONS = [
  { label: "Live music", emoji: "🎸" },
  { label: "Foodie", emoji: "🍜" },
  { label: "Outdoors", emoji: "🏕️" },
  { label: "Nightlife", emoji: "🪩" },
  { label: "Art", emoji: "🎨" },
  { label: "Chill", emoji: "🛋️" },
  { label: "Sports", emoji: "⚽" },
  { label: "Markets", emoji: "🛍️" },
] as const;

export const ACCESSIBILITY_TOGGLES = [
  { label: "Wheelchair accessible", emoji: "♿" },
  { label: "Step-free venues", emoji: "🚪" },
  { label: "Quiet spaces", emoji: "🤫" },
  { label: "Accessible restrooms", emoji: "🚻" },
  { label: "Near transit", emoji: "🚇" },
] as const;

export const OTHER_SOURCE_OPTIONS = [
  { id: "luma", label: "Luma", emoji: "✨" },
  { id: "eventbrite", label: "Eventbrite", emoji: "🎟️" },
  { id: "ical", label: "iCal", emoji: "📅" },
] as const;

export const ONBOARDING_STEP_COUNT = 6;

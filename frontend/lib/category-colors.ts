const CATEGORY_PALETTE: Record<string, { bg: string; text: string }> = {
  music: { bg: "bg-purple-soft", text: "text-purple-deep" },
  food: { bg: "bg-coral-soft", text: "text-coral-deep" },
  festival: { bg: "bg-amber-soft", text: "text-amber" },
  conference: { bg: "bg-teal-soft", text: "text-teal-deep" },
  nightlife: { bg: "bg-purple-soft", text: "text-purple" },
  outdoor: { bg: "bg-teal-soft", text: "text-teal" },
  art: { bg: "bg-coral-soft", text: "text-coral" },
  market: { bg: "bg-amber-soft", text: "text-amber" },
  sports: { bg: "bg-teal-soft", text: "text-teal-deep" },
  default: { bg: "bg-purple-soft", text: "text-purple-deep" },
};

export function getCategoryColors(category: string): { bg: string; text: string } {
  const key = category.toLowerCase();
  for (const [pattern, colors] of Object.entries(CATEGORY_PALETTE)) {
    if (pattern !== "default" && key.includes(pattern)) {
      return colors;
    }
  }
  return CATEGORY_PALETTE.default;
}

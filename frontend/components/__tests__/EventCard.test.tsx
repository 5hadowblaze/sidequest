import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import EventCard from "../EventCard";
import type { DiscoverEvent } from "@/lib/types";

const baseEvent: DiscoverEvent = {
  id: "evt-1",
  title: "Sunset Jazz on the River",
  description: "An evening of live jazz with local food trucks.",
  category: "Music",
  image_url: "https://example.com/jazz.jpg",
  price_estimate: 30,
  price_label: "$30",
  location: "Lady Bird Lake, Austin",
  lat: 30.25,
  lng: -97.75,
  url: "https://example.com/jazz",
  date_hint: "Sat 7pm",
};

describe("EventCard", () => {
  it("renders title, category, price, and location", () => {
    render(
      <EventCard event={baseEvent} selected={false} onClick={() => {}} />,
    );

    expect(screen.getByText("Sunset Jazz on the River")).toBeInTheDocument();
    expect(screen.getByText("Music")).toBeInTheDocument();
    expect(screen.getByText("$30")).toBeInTheDocument();
    expect(
      screen.getByText("Sat 7pm · Lady Bird Lake, Austin"),
    ).toBeInTheDocument();
  });

  it("renders passed_rules badges with formatted labels", () => {
    render(
      <EventCard
        event={{
          ...baseEvent,
          passed_rules: ["budget_ok", "diet_match", "activity_match"],
        }}
        selected={false}
        onClick={() => {}}
      />,
    );

    expect(screen.getByText("Budget")).toBeInTheDocument();
    expect(screen.getByText("Diet")).toBeInTheDocument();
    expect(screen.getByText("Activities")).toBeInTheDocument();
  });

  it("shows overflow badge when more than three rules pass", () => {
    render(
      <EventCard
        event={{
          ...baseEvent,
          passed_rules: [
            "budget_ok",
            "loc_ok",
            "diet_match",
            "activity_match",
            "access_match",
            "slot_ok",
          ],
        }}
        selected={false}
        onClick={() => {}}
      />,
    );

    expect(screen.getByText("+3")).toBeInTheDocument();
  });

  it("renders Prometheux verified pill when prometheux_verified is true", () => {
    render(
      <EventCard
        event={{ ...baseEvent, prometheux_verified: true }}
        selected={false}
        onClick={() => {}}
      />,
    );

    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("does not render Prometheux pill when not verified", () => {
    render(
      <EventCard
        event={{ ...baseEvent, prometheux_verified: false }}
        selected={false}
        onClick={() => {}}
      />,
    );

    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
  });

  it("applies selected styling when selected", () => {
    const { container } = render(
      <EventCard event={baseEvent} selected onClick={() => {}} />,
    );

    const button = container.querySelector("button");
    expect(button?.className).toContain("event-card--map-selected");
  });
});

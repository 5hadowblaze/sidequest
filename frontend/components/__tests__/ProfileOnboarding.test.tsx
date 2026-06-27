import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ProfileOnboarding from "../ProfileOnboarding";

async function advanceToBudget(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "London" }));
  await user.click(screen.getByRole("button", { name: /let's go/i }));
}

async function advanceToDiet(user: ReturnType<typeof userEvent.setup>) {
  await advanceToBudget(user);
  await user.click(screen.getByRole("button", { name: /next/i }));
}

async function advanceToActivities(user: ReturnType<typeof userEvent.setup>) {
  await advanceToDiet(user);
  await user.click(screen.getByRole("button", { name: "Vegan" }));
  await user.click(screen.getByRole("button", { name: /next/i }));
}

async function advanceToAccessibility(user: ReturnType<typeof userEvent.setup>) {
  await advanceToActivities(user);
  await user.click(screen.getByRole("button", { name: "Live music" }));
  await user.click(screen.getByRole("button", { name: /next/i }));
}

async function advanceToConnections(user: ReturnType<typeof userEvent.setup>) {
  await advanceToAccessibility(user);
  await user.click(screen.getByRole("button", { name: /next/i }));
}

describe("ProfileOnboarding", () => {
  it("shows validation error when home city is empty", async () => {
    const user = userEvent.setup();
    render(<ProfileOnboarding onComplete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /let's go/i }));

    expect(
      screen.getByText(/pick a city or type your own/i),
    ).toBeInTheDocument();
  });

  it("shows validation error when diet is missing", async () => {
    const user = userEvent.setup();
    render(<ProfileOnboarding onComplete={vi.fn()} />);

    await advanceToDiet(user);
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(
      screen.getByText(/tap at least one diet option/i),
    ).toBeInTheDocument();
  });

  it("shows validation error when no activities are selected", async () => {
    const user = userEvent.setup();
    render(<ProfileOnboarding onComplete={vi.fn()} />);

    await advanceToActivities(user);
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(
      screen.getByText(/pick at least one vibe/i),
    ).toBeInTheDocument();
  });

  it("calls onComplete with a valid profile after celebration", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onComplete = vi.fn();
    render(<ProfileOnboarding onComplete={onComplete} />);

    await advanceToAccessibility(user);
    await user.click(
      screen.getByRole("button", { name: "Wheelchair accessible" }),
    );
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText(/you're in/i)).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(2300);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledOnce();
    });

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        homeCity: "London",
        budget: 150,
        diet: "Vegan",
        activities: "Live music",
        accessibility: "Wheelchair accessible",
        onboardingComplete: true,
      }),
    );

    vi.useRealTimers();
  });

  it("allows skipping accessibility", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onComplete = vi.fn();
    render(<ProfileOnboarding onComplete={onComplete} />);

    await advanceToAccessibility(user);
    await user.click(screen.getByRole("button", { name: "Skip" }));
    await user.click(screen.getByRole("button", { name: /next/i }));

    await vi.advanceTimersByTimeAsync(2300);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledOnce();
    });

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        accessibility: undefined,
      }),
    );

    vi.useRealTimers();
  });

  it("pre-fills fields from initial profile", async () => {
    const user = userEvent.setup();
    render(
      <ProfileOnboarding
        onComplete={vi.fn()}
        initial={{
          homeCity: "Portland, OR",
          budget: 120,
          diet: "Vegetarian",
          activities: "Markets",
        }}
      />,
    );

    expect(screen.getByDisplayValue("Portland, OR")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /let's go/i }));
    expect(screen.getByText("£120")).toBeInTheDocument();
  });
});

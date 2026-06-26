# Sidequest — Hackathon Video Pitch Script (v1)

**Format:** Optional 10 sec on camera → screen recording with voiceover. No slides.  
**Target length:** ~2:50–3:00  
**Tagline:** Sidequest — your weekend, verified.

---

## ACT 1 — The problem (0:00 – 0:40)

*You, casual — walking in London or at your laptop*

"I'm in London right now. I go to hackathons all the time — I sign up on **Luma**, I commit to the build, I'm in the zone Saturday… and then there's the rest of the weekend.

The problem isn't that there's nothing to do. There's *too much*. Hackathons, meetups, pop-ups, dinner with friends, a swim at **Hampstead Heath** if the weather's right — but I don't have the time to scroll through a hundred listings and figure out: Can I actually make this? Can I afford it? Do I even *want* it? And if a mate's free — does anything work for both of us?

I kept closing tabs and still not knowing what my weekend was. That's the thing I wanted to fix."

---

## ACT 2 — What I built (0:40 – 1:00)

*Cut to Sidequest*

"So I built **Sidequest** — *your weekend, verified*.

You set your constraints — budget, diet, what you're in the mood for. It reads your calendar so it knows when you're free. It searches the **live web** for real events, runs them through a **deterministic filter** so junk never reaches the AI, and gives you a plan with citations — not vibes."

---

## ACT 3 — Demo: Discover (1:00 – 1:55)

**[Sign in → profile: London, budget, preferences]**

"I'm in London. Say I want something under fifty quid, I'm vegan, and I'm into live music and getting outside."

**[Map loads — events pin across the city]**

"Sidequest hits the open web with **Tavily** — actual listings, this week. Then **Prometheux** applies Vadalog rules: budget, location, diet, my free slots from Google Calendar. Twelve in, four out — only what passed shows up here."

**[Tap a card — badges: Budget, Diet, free Saturday afternoon]**

"Every badge is a rule that passed. I'm not trusting an LLM to guess whether Hampstead Heath or a rooftop gig fits my life — the logic already decided."

---

## ACT 4 — Demo: Plan (1:55 – 2:40)

**[Select event → Plan this weekend]**

"This one's interesting. I plan the full weekend around it — events, food, the lot. Same pipeline: search, **verify**, then Gemini formats an itinerary from verified rows only. No invented restaurants."

**[Results panel — itinerary + filter stats]**

"Saturday afternoon, Sunday morning — real venues, real links, real prices."

**[Open cited.md]**

"And the agent publishes to **cited.md** — filter stats, every verified candidate, the full itinerary, sources. If a judge — or future me — asks 'why this plan?', the answer is in the file."

---

## ACT 5 — Close (2:40 – 3:00)

"Sometimes I want a hackathon. Sometimes drinks with friends. Sometimes a swim. Sidequest doesn't pick for me — it cuts the scroll, applies my constraints, and only shows what's real.

Your main quest might be the build. **Sidequest is everything else — verified.**

GitHub in the description. Go plan your weekend."

**[End card: Sidequest logo + GitHub + 'your weekend, verified']**

---

## Shot list

| Time | Visual |
|------|--------|
| 0:00 | You talking OR phone scrolling aimlessly (B-roll) |
| 0:40 | Sidequest sign-in screen |
| 1:00 | Onboarding form fill |
| 1:10 | Map + event cards + filter stats |
| 1:30 | Event card badges close-up |
| 1:55 | Plan button → loading → results panel |
| 2:15 | cited.md scroll |
| 2:35 | Langfuse trace (optional, 3 sec) |
| 2:50 | End card |

---

## One-liner

"I built Sidequest because London weekends are full of options — and I was spending more time scrolling than actually living them."

---

## Hackathon checklist

- Autonomous agent on open web (Tavily)
- Prometheux deterministic filter
- cited.md mandatory output
- Live functional demo
- Sponsor tools: Tavily, Prometheux, Gemini, Langfuse, Firebase

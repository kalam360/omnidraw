---
name: Scene deck builder
description: Build a sequence of N scenes for a topic — one at a time.
icon: "2"
shortcut: "2"
---

# Scene deck builder

You are building a small "deck" of hand-drawn scenes that walk a viewer
through a topic. Each scene lives on its own canvas; together they
tell a story.

## Always ask first (if missing)

Before generating anything, confirm two things with the user — both in
a single short clarifying message:

1. **Topic.** What concept does the deck explain?
2. **Length.** How many scenes? (Default: 5. Range: 3–10.)

If both are present in the user's request, skip the question and start
building.

## Output one scene at a time

For each scene in the deck:

1. Name it (`Scene N: <short title>`).
2. Call `create_scene` with `title` set to the scene title.
3. End that scene's response with a short caption that *teases* the
   next scene ("Next: how the cache invalidates.") so the user knows
   there's more coming.

Wait for the user to say "next" (or scroll) before producing the next
scene. **Don't dump all N scenes at once.**

## Style across the deck

- **Consistency.** The colour roles you pick in scene 1 carry through
  to scene N. If "data" was orange in scene 1, it's orange in scene 5.
- **Progressive disclosure.** Each scene should add roughly one
  concept's worth of content. If you're tempted to cram, split it
  into two scenes.
- **Visual through-line.** A recurring shape or motif (e.g. the same
  user-icon, the same database cylinder) ties the scenes together.

## Hand-drawn defaults

Same as Diagram explainer:
- `roughness: 1`, `strokeWidth: 2`, `fontFamily: 1`
- Short labels, generous whitespace
- Arrows only for real flow

## When to stop

When you've delivered the agreed length. Don't volunteer extras —
the user can ask for "one more scene" if they want it.

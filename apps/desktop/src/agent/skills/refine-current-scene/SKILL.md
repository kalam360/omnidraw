---
name: Refine current scene
description: Read the current canvas and improve it in place — clean up, add a legend, reduce density.
icon: "3"
shortcut: "3"
---

# Refine current scene

The user already has a scene on the canvas and wants it improved. Your
job is to make targeted changes — *not* to redraw from scratch.

## Always start by reading

The first thing you do, every turn, is call `get_scene`. You cannot
refine what you haven't seen. After reading, briefly state what you
notice in one sentence ("12 elements, 3 colour groups, no legend").
Then propose changes.

## Make minimal, targeted edits

Use `update_elements` and `remove_elements` — not `create_scene`. The
goal is to preserve the user's intent and layout, not replace it.

Common refinements:

- **Add a legend.** New text + small coloured rectangles in a corner.
  Use `add_elements`, not `create_scene`.
- **Reduce density.** If 20+ elements share one cluster, group them
  visually (a containing rectangle behind them) or remove redundant
  arrows. Don't delete content the user authored without saying so.
- **Recolour by role.** If colours are inconsistent, propose a
  consistent role mapping and apply it via `update_elements`. State
  the mapping explicitly in your reply ("treating purple as 'actor'
  everywhere").
- **Tidy labels.** Long labels become 1–3 words; missing labels get
  added.

## Confirm destructive changes

Before deleting elements the user drew, say which ones and why. If the
ask is ambiguous ("clean it up"), make one pass of safe edits and then
ask "Want me to also drop the X?"

## Don't fight the user

If the user asked for a specific change ("make all arrows red"), do
exactly that change. Save aesthetic opinions for when they're invited.

## Hand-drawn defaults still apply

Roughness 1, stroke width 2, Virgil font. But preserve whatever the
user already chose where you can.

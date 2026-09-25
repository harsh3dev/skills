---
name: explain-flow
description: Explain how code, a system, or a data flow works so the user can understand and remember it. Use this whenever the user wants to understand rather than fix — "explain", "how does X work", "walk me through", "what is the flow", "how does the frontend handle Y", "what happens when", "I don't get it", "simplify this", or any cross-repo / architecture question. Use it even if the user also asks for issues or findings, because the explanation still has to come first and be easy to follow.
---

# Explain Flow

The goal is not a complete report. The goal is that the user can **understand the flow now and redraw it from memory tomorrow**.

A correct answer that the user can't follow has failed. Research carefully, then teach simply.

## What a wrong explanation will look like:

- It opened with file names and event names, before giving any simple picture.
- It covered everything at once: 5 types, 4 repos, stream format, validation, and 14 issues.
- Bugs were mixed into the flow diagrams, so the user was learning the system and its problems at the same time.
- Diagrams had file paths, line numbers, and notes inside boxes.
- Jargon was never explained ("fails open", "passthrough", "envelope", "sniff shapes").
- The same thing had four names ("order card", "action", "action artifact", "widget").
- There was no worked example and nothing short to remember at the end.
- It added refactor ideas nobody asked for.

Every rule below fixes one of these.

## Step 1 — Research first (don't skip)

Do the full investigation before writing: read the code, trace the data, verify claims. Keep evidence (file:line) for yourself. The simplicity is in the *writing*, not the research. Never simplify by guessing.

While researching, note:
- The 3–6 main parts the data passes through.
- The one idea that explains the whole system.
- The names the code uses for each thing (so you can pick one).
- What the user already believes. If they said "I think there are only 2 types", start from that and correct it gently if applicable.

## Step 2 — Write in this order

Use this structure. Skip a section only if it truly doesn't apply.

### 1. The idea (2–3 sentences)
Explain the whole system as if to a smart person who has never seen the code. No file names, no event names, no jargon. An everyday comparison helps if it fits naturally.

> Example: "The backend sends two things: a small data object saying what to show, and a tag inside the chat text saying where to show it. The frontend matches them by id and draws the component at the tag's spot."

### 2. The big picture
One simple ASCII box diagram inside a code block, max ~8 boxes, plain names only. No Mermaid or SVG.

```
┌──────────┐   ┌────────────────┐   ┌─────────────┐   ┌───────────┐
│ MCP tool │──▶│ Python backend │──▶│ Java filter │──▶│ React app │
└──────────┘   └────────────────┘   └─────────────┘   └─────┬─────┘
                                                            ▼
                                                      ┌───────────┐
                                                      │  screen   │
                                                      └───────────┘
```

Two lines of text around it, max.

### 3. One real example, step by step
Trace one concrete case from start to end, like "user types *buy 10 TCS*". Numbered steps, one sentence each. This is what makes the flow stick in memory, so don't skip it.

### 4. Details (only what the question needs)
Now go one level deeper on the part the user asked about. If there are several parts, cover the most important one and list the others as one line each for later.

### 5. What's broken (separate section, only if asked or truly important)
Keep it apart from the flow. Top 3–5 issues, one or two plain sentences each: what breaks, and what the user sees. Offer the full list instead of dumping it.

### 6. Where it lives
A table at the end: part → file(s). This is where file:line goes, not in the explanation above.

| Part | File |
|---|---|
| Java filter | `ToolResultSanitizer.java:104-137` |

### 7. Remember
3 lines max. The core idea only. Then at most one question: which part to go deeper on.

## Writing rules

- Short sentences. One idea each. Plain words.
- Define a new term the first time, in five words or less. If a plain word works, use it.
- One name per thing, always.
- Diagrams are ASCII boxes and arrows in a code block, never Mermaid or SVG.
- Diagrams: plain names in boxes, no notes, no line numbers, no ✗ marks in an explanation diagram. If the system is big, draw a simple overview first, then a zoomed-in view of one part.
- Don't put everything in. Leave out true facts that don't help this question. The user can ask for more.
- No unrequested refactors, redesigns, or "what I'd change". Offer them in one line at the end.
- If the answer is getting longer than about one screen before the details section, stop and ask what to expand instead.

## Follow-up questions

On a follow-up ("now tell me about X"), reuse the same names and the same big-picture diagram, and show where X fits in it. Don't restart from zero, and don't repeat what was already explained.

## Quick self-check before sending

- Could someone new understand the first 3 sentences?
- Is every thing called by just one name?
- Is there one real example traced end to end?
- Are bugs kept out of the flow explanation?
- Are file paths only in the table at the end?
- Does it end with a 3-line Remember block?
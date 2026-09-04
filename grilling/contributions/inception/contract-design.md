---
target: contract-design
plugin: grilling
fragments:
  - anchor: before-step:3
    order: 100
---

## fragment: before-step:3

### Grill me (grilling): a fourth interaction mode for this stage's questions

When this stage presents the interaction-mode choice of stage-protocol.md §3
Step 2, offer a **fourth** option after the protocol's three (Guide me /
I'll edit the file / Chat):

- label: `Grill me`
- description: `Interview me in rounds of independent questions, each with a recommended answer; drill into every branch until we share the same understanding`

Nothing else about that question changes. Render it through the harness
question-rendering annex exactly as you would any structured question (the
annex's Other rule and numbering invariant apply unchanged, so Other simply
follows Grill me), and log the mode choice as §3 requires for the other three
modes.

**Step 3d: If "Grill me" (interview mode):**

Grill me is Guide me run as an interview over a design tree: questions come in
rounds of independent questions, every question carries a recommended answer,
the small decisions are yours to make and record, and the interview ends only
when nothing is left silently assumed. Everything the protocol prescribes for
Guide me applies unchanged — structured questions rendered per the annex, the
§3 decision / answer logging pair around every non-gate screen,
Question interaction log entries with fresh timestamps, and the questions file
as the source of truth. Only the following differs.

**The design tree and the frontier.** Treat the questions this stage drafted
as decisions in a design tree: every decision branches into the decisions that
hang off it. Give each decision its prerequisites (what must be settled before
it can honestly be asked) and its size (below); add the decisions an answer
reveals as you go. The **frontier** is every decision whose prerequisites are
all settled — the questions you can ask now without guessing at answers you
have not heard. Ask the whole frontier in one **round**. The questions of a
round must be independent of each other: a question whose answer depends on
another question still open in this round belongs to a later round. After
every answer, update the tree and recompute the frontier; never reuse the
previous round's frontier. There is no cap on the number of questions — the
size of the decisions limits the interview, not their count.

**Decision size and Depth.** Size every decision with two questions before
deciding who answers it: **Reach** — if this flipped later, what else would
change? **Undo** — how hard is it to reverse?

- **XL** — changes the shape of the solution: a boundary, the architectural style, who owns the data. Ask: "Would reversing this redraw a boundary or reopen the design?" e.g. keeping the interview ledger in the questions file vs. a separate store. Not XL: which harness gets the first live check (M).
- **L** — changes a component's responsibility or a contract between components. Ask: "Would another component's interface change if this flipped?" e.g. the installer running compose itself vs. leaving it to the user. Not L: the installer's default harness name (S).
- **M** — user-visible behaviour inside one component: a rule, a workflow, what happens on error. Ask: "Would the user notice a different outcome, with no interface changing?" e.g. how many questions share one screen. Not M: the wording of the recommended-answer marker (S).
- **S** — a local choice: a default, a name, a format, a threshold. Ask: "Could this be changed later in one place, in minutes, without telling anyone?" e.g. the provenance file name. Not S: whether provenance exists at all (L).
- **SS** — a choice the user never sees. Ask: "Would the user notice at all?" e.g. the key order inside the provenance JSON. Not SS: the format of a decided-assumption line (S) — the user reads it.

When two tiers both fit, take the larger one.

Read `**Depth**` from `aidlc-state.md`; it sets the smallest tier the human is
asked about. Depth is not a question cap: every decision at or above the
threshold is asked, however many there are.

| Depth | Ask the human | Decide yourself, as a decided assumption |
|-------|---------------|------------------------------------------|
| Minimal | XL, L | M, S, SS |
| Standard | XL, L, M | S, SS |
| Comprehensive | XL, L, M, S | SS |

SS is always decided by the agent.

**Decided assumptions.** A decision below the threshold whose prerequisites
are settled is decided by you, with the answer you would have recommended, and
written down — never silently. Directly after that round's questions in the
questions file, add a heading in the conversation language (in English:
`### Decided assumptions (round <n>)`) and one line per decision:
`- [<tier>] <decision> — <reason>`. The tier tags `[XL]` `[L]` `[M]` `[S]`
`[SS]` are fixed tokens. A round with no decided assumptions gets no heading.
A round that holds decided assumptions but no questions is appended without a
screen; recompute the frontier and continue.

**The ledger.** Before presenting a round, append it to the questions file: a
round heading in the conversation language (in English: `## Round <n>`), then
each question with a number in one sequence across the whole file (Q<n> never
restarts), a title, a body that gives one line of context, its options (the
last one `X. Other (please specify)`), the recommended option with one line of
reasoning, and a blank `[Answer]:` tag. Write each answer back as soon as it
arrives — the chosen option letter (or the free text for Other) in the
`[Answer]:` tag and `**Mode:** grill` on its own line directly beneath it,
never inside the answer value — before presenting the next screen. Record the
§3 decision / answer logging pair for every screen you present, each with a
fresh timestamp, exactly as the protocol prescribes for Guide me.

**Rendering.** On Claude Code, put the recommended option **first** and mark
it in the option's **label** — the short heading the user reads first, e.g.
`A. Command-line argument (Recommended)` — by appending " (Recommended)" to
that label. The description may repeat the reasoning, but the marker lives in
the label, never only in the description. Reorder for the presentation only;
the questions file keeps its original option order and letters. One screen holds
at most four questions: split a round of five or more into screens of four,
and write back and log each screen before presenting the next; the questions
of a round are independent, so a split changes nothing. Do not recompute the
frontier between the screens of one round. Before the first screen, tell the
user they can select Other on any question to discuss it before answering. On
a harness that renders questions as numbered prose, present the whole round in
one message in the upstream format — `❓ **Q<n>** - **<title>**: <body, with
the options rendered per the annex>` / `➡️ <recommended answer and reason>`,
questions separated by `---` — keeping the option order unchanged: the
recommendation is the ➡️ line, never a reordering. The user answers by
question number, e.g. `1 A, 2 B`.

**Facts are yours, decisions are the user's.** Never ask what you can look up:
file contents, configuration, prior stage artifacts, the reference
implementation. Where the harness offers sub-agents, dispatch one to find the
fact; otherwise look it up yourself. A running lookup is an unsettled
prerequisite: only the decisions downstream of it wait — ask the rest of the
frontier now. Append a question that waits on a lookup to the questions file
straight away, with a blank `[Answer]:` tag and `**Pending:** <what you are
looking up>` beneath it, and ask it in the first round after the result
arrives (drop the Pending line then). If the result settles the question,
write `[Answer]: Resolved by lookup (round <n>)` with `**Mode:** grill` beneath
it and record the decision and its reason under that round's decided
assumptions.

**Finishing: shared understanding first.** The interview is over when the
frontier is empty — every branch visited, nothing left silently assumed. Then
rejoin Step 3a: the consolidated summary lists every answer and, after them,
every decided assumption in round order (that summary is where the user
confirms them in bulk), followed by the review brief and the Looks correct /
Request changes checkpoint exactly as Guide me does. Generate no artifact
before that confirmation. On Request changes, a decided assumption the user
objects to is promoted to a question in the next round (tier unchanged); an
objection to an answered question reopens that branch and its dependants.
Recompute the frontier, continue the rounds, and present the summary again
when it empties. Only when the user says the interview has gone far enough do
you stop early: record the remaining decisions as decided assumptions, each
with its tier so the summary shows what the user left to you, and go to the
summary. Never decide a decision above the threshold on your own.

**One question at a time.** If `## Corrections` in
`aidlc/spaces/<active-space>/memory/project.md` carries a line saying that
Grill me (or grilling) should ask one question at a time — judge by meaning,
in any language, not by exact wording — or the user asks for it during the
interview, present each screen with a single question. The frontier, the
ledger, and the decided assumptions do not change; only the number of
questions per screen does. A request made in conversation applies to the rest
of this stage; leave persisting it to the §13 learnings ritual.

Mode switching mid-stage, the depth table, and always-justified follow-ups
are unchanged.

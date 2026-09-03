---
target: environment-provisioning
plugin: grilling
fragments:
  - anchor: after-step:2
    order: 100
---

## fragment: after-step:2

### Grill me (grilling): a fourth interaction mode for this stage's questions

When this stage presents the interaction-mode choice of stage-protocol.md §3
Step 2, offer a **fourth** option after the protocol's three (Guide me /
I'll edit the file / Chat):

- label: `Grill me`
- description: `Interview me one question at a time with a recommended answer; drill into every branch until we share the same understanding`

Nothing else about that question changes. Render it through the harness
question-rendering annex exactly as you would any structured question (the
annex's Other rule and numbering invariant apply unchanged, so Other simply
follows Grill me), and log the mode choice as §3 requires for the other three
modes.

**Step 3d: If "Grill me" (interview mode):**

Grill me is Guide me with a batch size of one, a recommended answer on every
question, and dependency-ordered follow-ups. Everything the protocol prescribes
for Guide me applies unchanged: structured questions rendered per the annex,
the §3 decision/answer logging pair around every non-gate question, Question
interaction log entries with fresh timestamps, and the questions file as the
source of truth. Only the following differs:

- Order the questions file's questions by dependency: a question whose answer
  narrows another comes first. Present them **one per turn**; never present two
  questions at once.
- Attach a recommended answer and one line of reasoning to every question. In
  the structured question, put the recommended option **first** and append
  "(Recommended)" to its label — reorder the options for the presentation only;
  the questions file keeps its original option order and letters.
- Look up facts yourself (existing code, prior stage artifacts, configuration)
  instead of asking. Only decisions go to the human.
- Write each answer back immediately, before presenting the next question: the
  chosen option in that question's `[Answer]:` tag, and `**Mode:** grill` on
  its own line directly beneath the tag (never inside the answer value),
  mirroring the `**Mode:** chat` marker.
- A follow-up that an answer opens is appended to the questions file with a
  blank `[Answer]:` tag before the turn ends (§3's pending-question rule), then
  asked as the next question.
- When every `[Answer]:` tag is filled, rejoin Step 3a: the consolidated
  summary, the review brief, and the Looks correct / Request changes checkpoint,
  exactly as Guide me does.
- Mode switching mid-stage, the depth table, and always-justified follow-ups
  are unchanged.

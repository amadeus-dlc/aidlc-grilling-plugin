---
target: deployment-execution
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

Render it through the harness question-rendering annex like any other option.
On a numbered-prose harness the mode question therefore has five lines:
`1. Guide me`, `2. I'll edit the file`, `3. Chat`, `4. Grill me`, and the
synthesized `5. Other`. The annex's canonical example shows Other as `4`; with
Grill me present, Other moves to `5`, which still satisfies the pre-send
invariant (Other last, exactly once, numbered one above the non-Other count).
On Claude Code the four labels fill `AskUserQuestion` exactly and its built-in
Other stays the escape. Log the mode choice with the Question interaction log
format, as for the other three modes.

**Step 3d: If "Grill me" (interview mode):**

Grill me is Guide me with a batch size of one, a recommended answer on every
question, and dependency-ordered follow-ups. Its bookkeeping is identical to
Guide me: the questions file stays the source of truth.

- Order the questions file's questions by dependency: a question whose answer
  narrows another comes first. Present them as structured questions **one per
  turn**; never present two questions at once.
- Attach a recommended answer and one line of reasoning to every question.
  List the recommended option first with "(Recommended)" appended to its
  label; the file keeps its original option order and letters.
- Look up facts yourself (existing code, prior stage artifacts, configuration)
  instead of asking. Only decisions go to the human.
- Before each question run `bun {{HARNESS_DIR}}/tools/aidlc-log.ts decision
  --stage <slug> --decision "<question>" --options "<csv>"`. After the answer,
  immediately write it to that question's `[Answer]:` tag with `**Mode:** grill`,
  run `bun {{HARNESS_DIR}}/tools/aidlc-log.ts answer --stage <slug> --details
  "<exact choice>"`, and append a Question interaction log entry. Add `--unit`
  or `--single` exactly as the protocol requires for this stage's identity. Take
  a fresh `date -u` timestamp for every question; never reuse one.
- When an answer opens a new branch, append the follow-up question to the
  questions file with a blank `[Answer]:` tag **before ending the turn**, then
  present it as the next question. The forwarding-loop Stop hook needs that
  blank tag to recognise a pending human-wait.
- When every `[Answer]:` tag is filled, rejoin Step 3a: present the consolidated
  summary as unordered bullets, run `aidlc-review-brief.ts summary`, and persist
  the Looks correct / Request changes checkpoint exactly as Guide me does.
- Switching modes mid-stage stays allowed, the depth table still sets the
  question volume, and follow-ups are always justified.

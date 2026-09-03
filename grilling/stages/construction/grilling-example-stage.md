---
slug: grilling-example-stage
name: Grilling Example
plugin: grilling
phase: construction
execution: CONDITIONAL
condition: Execute when the grilling plugin example is selected for the current workflow.
lead_agent: grilling-example-agent
support_agents: []
mode: inline
produces:
  - grilling-example-output
consumes: []
requires_stage: []
sensors: []
scopes:
  - grilling-example
inputs: Existing project context relevant to this plugin
outputs: grilling-example-output.md (under this stage's record dir, engine-resolved)
---

# Grilling Example

<!--
`produces` declares artifact slugs this stage writes. The engine resolves each
artifact to this stage's intent record directory; do not hard-code that path.

`consumes` declares upstream artifacts this stage reads. Use entries shaped as:
  - artifact: upstream-artifact-slug
    required: true
-->

## Steps

1. Read the current project context and any declared consumed artifacts.
2. Produce `grilling-example-output.md` in the engine-resolved record directory.
3. Report completion through the normal stage protocol.

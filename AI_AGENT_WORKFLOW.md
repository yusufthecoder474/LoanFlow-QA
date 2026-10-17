# Optional AI-assisted test planning

The regular suite does not use an AI API, key, model, or agent. Its assertions come from REQUIREMENTS.md.

## Inputs

Give your coding client REQUIREMENTS.md, TEST_CASES.md, specs/agent-generated-plan.md, tests/seed.spec.ts (using playwright.agent.config.ts), and the application URL http://127.0.0.1:5173. Start only the clean synthetic app (`npm run dev`). A fresh seed is advisable; seeding resets the dedicated demo database.

## Supported integrations

Installed Playwright Test 1.64.0 supports `npx playwright init-agents --loop=codex` (also VS Code and other supported clients). It produced planner and generator definitions under .codex/agents/. The default healer was deliberately removed: this project requires diagnosis and human review rather than automatic changes to assertions.

`npm run agents:init` regenerates upstream definitions and may recreate the healer. Remove that healer registration before use and apply AGENTS.md to both remaining agents. Regenerate after upgrading Playwright. No agent is automatically invoked by npm test.

For an MCP-capable client, start the pinned server with `npm run agents:mcp` or configure:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "--no-install",
        "@playwright/mcp",
        "--headless",
        "--isolated",
        "--allowed-origins",
        "http://127.0.0.1:5173"
      ]
    }
  }
}
```

The installed MCP defaults to Chrome; if needed, add `--executable-path` pointing to your installed Chromium. The isolated browser prevents reuse of personal browser sessions. Origin allowlists are convenience controls, not a security boundary. Only interact with this synthetic local app.

## Auditable process

1. Planner reads authoritative criteria and scenario inventory before observing the app.
2. Planner uses MCP or the supported agent tools to explore actual selectors and flows.
3. Planner proposes a Markdown plan with steps, expected results, requirement IDs and missing coverage.
4. Generator may write tests only in agent-candidates/. They are not collected by Playwright.
5. A person checks every assertion against the human criteria, records accepted/rejected rationale, and moves approved candidates into tests/.
6. Run typecheck, lint, clean suite and review traces. A failing candidate is diagnosed; do not skip it or silently alter app rules.

Suggested prompt: “Explore the local LoanFlow app using Playwright MCP. Read REQUIREMENTS.md and TEST_CASES.md first. Propose missing happy-path, negative, boundary and authorization tests. For each expected result cite its requirement ID and observed locator. Write no active tests and modify no app files. Save a proposal under specs/.”

## Actual evidence and review honesty

scripts/explore.ts attempted real MCP navigation but failed because this environment prohibits its Unix socket binding (EPERM). artifacts/mcp-exploration.json records the block. scripts/demo.ts used regular Playwright to capture the three screens and a final approval. The coding assistant produced specs/agent-generated-plan.md from those regular browser observations. Successful MCP exploration remains unverified. This is not a separately executed official planner/generator agent session and not a completed human review.

Illustrative human-review choices (examples, not approvals already received): accept G02 because R06 forbids other-user mutations; accept G03 because the documented upload limit needs a boundary test; reject G06 because it contradicts R04; reject G07 because it weakens R09. G01–G03 remain pending; G04–G05 already exist in the manually constructed baseline. There is no claim that an agent approved its own changes.

## Reproduce exploration

With a native PostgreSQL server, run migrations/seed then `node --import tsx scripts/explore.ts` with app ports free. With the explicit portable fallback, run `npm run verify:portable -- explore`. The script starts/stops the local API/Vite/MCP itself. Supply CHROMIUM_PATH only when using a browser other than Playwright's default.

Sources: https://playwright.dev/docs/test-agents and https://github.com/microsoft/playwright-mcp. The installed CLI --help and generated definitions were also inspected, rather than assuming support from a blog post.

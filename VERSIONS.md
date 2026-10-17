# Versions used

Node.js 24.19.0; npm 11.9.0. Native Docker/CI target PostgreSQL 16.15. Explicit local fallback PGlite 0.5.8 (PostgreSQL 18.3 WASM) and pglite-socket 0.2.11.

| Package                     | Exact version |
| --------------------------- | ------------- |
| dotenv                      | 18.0.7        |
| express                     | 5.3.0         |
| multer                      | 2.4.0         |
| pg                          | 8.23.1        |
| react                       | 19.3.0        |
| react-dom                   | 19.3.0        |
| zod                         | 4.6.5         |
| @electric-sql/pglite        | 0.5.8         |
| @electric-sql/pglite-socket | 0.2.11        |
| @eslint/js                  | 10.0.1        |
| @playwright/mcp             | 0.0.83        |
| @playwright/test            | 1.64.0        |
| @types/express              | 5.0.6         |
| @types/multer               | 2.3.0         |
| @types/node                 | 26.6.5        |
| @types/pg                   | 8.23.1        |
| @types/react                | 19.3.0        |
| @types/react-dom            | 19.3.0        |
| @vitejs/plugin-react        | 6.1.2         |
| concurrently                | 10.0.6        |
| eslint                      | 10.12.0       |
| prettier                    | 3.9.10        |
| tsx                         | 4.23.15       |
| typescript                  | 6.0.3         |
| typescript-eslint           | 8.71.1        |
| vite                        | 8.3.4         |

Actual browser/database versions and execution limits are recorded in EVALUATION.md. Primary references: https://playwright.dev/docs/test-agents, https://playwright.dev/docs/test-api-testing, https://node-postgres.com/features/queries, https://pglite.dev, https://nodejs.org/en/about/previous-releases. No claim is made that future upgrades are automatically compatible.

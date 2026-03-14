# Yoshi Exercise - Full Stack

### **Expectations:**

Complete the prompt below in advance. We will spend 50 minutes discussing your approach and the decisions you made, plus 10 minutes for your questions.

### Prompt:

Build a minimal application that ingests financial account data from a mocked upstream service called `plaidMockedService` and makes that data accessible to a browser client.

The goal of this exercise is to evaluate how you design and build with Cloudflare primitives, especially asynchronous and event-driven workflows.

### Core Requirements:

- Build the application in **TypeScript**
- Use a **Cloudflare Worker** for API and ingress handling
- Use **Cloudflare Queues** to process background sync work or upstream events asynchronously
- Use **Cloudflare Workflows** to orchestrate initial backfill and/or incremental sync processing
- Ingest account, balance, and transaction data from `plaidMockedService`
- Persist accounts, balances, transactions, and sync metadata so they are accessible to both the UI and future backend consumers
- Design for idempotency so duplicate events or retried jobs do not corrupt stored data
- Display accounts, balances, last synced time, sync status, and transactions in the browser

### What We Provide:

- A standalone GitHub repo for `plaidMockedService`, a TypeScript mock upstream service for the exercise
- Seeded financial scenarios with accounts, balances, transactions, and incremental sync frames
- Endpoints for creating sandbox items, fetching accounts, running cursor-based transaction sync, registering webhook URLs, and advancing mocked upstream state
- `SYNC_UPDATES_AVAILABLE` webhook payload simulation so you can test queue- and workflow-driven processing
- The service can be run locally from the provided repo
- The service is intended to match [Plaid](https://plaid.com/) functionality with less setup required

### Dev Notes:

- Keep the UI minimal. The focus is on backend architecture and Cloudflare usage, not visual polish
- Be prepared to explain the boundary between your Worker, Queue consumers, and Workflow steps
- Be prepared to explain your sync strategy, failure handling, retry behavior, and data model choices
- Assume the application may eventually ingest `accounts` from multiple upstream sources. Different sources may reference the same real-world account differently, so be prepared to explain how you would think about raw, staging, and canonical layers and how source accounts would ultimately roll up into a single canonical account
- Include a short README describing your architecture, tradeoffs, and what you would improve in production

### At Yoshi We Commonly Use:

You are welcome to bring your own stack. If you want to work with tools we already know well, these are common choices for us:

- [hono.dev](http://hono.dev) and `@hono/zod-openapi`
- drizzle
- vite and react
- react-query and hono rpc client
- postgres

### Bonus Points:

- Use drizzle, zod, and hono to create an end-to-end type-safe implementation where appropriate
- Add a dead-letter or replay strategy for failed queue messages
- Use a Cloudflare Durable Object or similar mechanism to communicate workflow or sync events to the client so the UI can refresh when new data is available
- Add lightweight observability for sync runs, queue processing, and workflow execution
- Make it easy to replay or simulate upstream updates from `plaidMockedService` during local development

### Important Areas of Focus:

- Cloudflare architecture decisions
- Queue and workflow boundaries
- Data modeling and sync strategy
- Canonical account modeling and multi-source ingestion considerations
- Failure handling and replay safety
- API design
- Observability
- Local developer experience

# plaidMockedService

`plaidMockedService` is a standalone TypeScript mock upstream for the Yoshi full-stack exercise. It keeps the domain fintech-focused without requiring candidates to spend their take-home time on a real Plaid integration.

The service is intended to be the provided upstream dependency for the exercise. Candidates build the Cloudflare-facing application; this repo supplies realistic account, balance, transaction, and webhook behavior.

## What It Does

- Creates sandbox items backed by deterministic scenarios
- Returns account and balance snapshots for a created item
- Supports cursor-based transaction sync with `added`, `modified`, `removed`, `has_more`, and `next_cursor`
- Simulates upstream change events by advancing an item to the next sync frame
- Posts `SYNC_UPDATES_AVAILABLE` webhook payloads to registered callback URLs

## API Surface

### `GET /v1/scenarios`

Lists the available seeded scenarios candidates can use for item creation.

### `POST /v1/items`

Creates a new sandbox item.

Request:

```json
{
  "scenario_id": "household-cashflow",
  "webhook_url": "https://example.ngrok.app/webhooks/plaid"
}
```

Response:

```json
{
  "item_id": "item_123",
  "access_token": "access-sandbox-123",
  "institution_name": "Plaid Mock Credit Union",
  "scenario_id": "household-cashflow",
  "available_frame_index": 0
}
```

### `POST /v1/accounts/get`

Returns the latest account and balance snapshot for an item.

Request:

```json
{
  "access_token": "access-sandbox-123"
}
```

### `POST /v1/transactions/sync`

Returns one page of incremental transaction data. Use `next_cursor` from the previous response until `has_more` is `false`.

Request:

```json
{
  "access_token": "access-sandbox-123",
  "cursor": null
}
```

### `POST /v1/webhooks/register`

Registers or adds a webhook URL for an existing item.

Request:

```json
{
  "access_token": "access-sandbox-123",
  "webhook_url": "https://example.ngrok.app/webhooks/plaid"
}
```

### `POST /v1/sandbox/items/advance`

Advances an item to the next available sync frame and dispatches `SYNC_UPDATES_AVAILABLE` payloads to registered webhook URLs.

Request:

```json
{
  "item_id": "item_123",
  "steps": 1
}
```

### `POST /v1/sandbox/items/reset`

Resets an item back to its initial sync frame.

## Local Development

```bash
pnpm install
pnpm dev
```

Useful commands:

- `pnpm typecheck`
- `pnpm test`
- `pnpm deploy`

## Scenario Model

Each scenario is a deterministic sequence of sync frames. A frame contains one or more pages. That lets candidates exercise:

- initial backfill loops
- incremental syncs
- duplicate-safe cursor handling
- replaying webhook-driven updates
- `added` / `modified` / `removed` transaction processing

## Suggested Exercise Wording

The corresponding exercise page can say:

- We provide a GitHub repo for `plaidMockedService`, a small TypeScript mock upstream service with seeded financial account and transaction scenarios.
- The service exposes endpoints for creating sandbox items, fetching accounts, running cursor-based transaction sync, registering webhook callbacks, and advancing mocked upstream state.
- You can use the hosted service directly or run it locally from the provided repo.

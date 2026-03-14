# plaidMockedService

`plaidMockedService` is a standalone TypeScript mock upstream for the Yoshi full-stack exercise.

The service is intended to be the provided upstream dependency for the exercise. Candidates build the Cloudflare-facing application; this repo supplies realistic account, balance, transaction, and webhook behavior.

For the full take-home exercise prompt, see [`PROMPT.md`](./PROMPT.md).

## Important Note

This repository is a helper artifact for the take-home exercise. It does **not** reflect Yoshi's production coding standards or repository conventions.

It was built by an agent and is intended only to make the concept of integrating with a Plaid-like service easier, so candidates can focus on properly ingesting, processing, and storing financial data instead of spending time on Plaid Link setup, signup flow configuration, and real Plaid integration details.

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

## Local Walkthrough

The examples below use `jq` for readable JSON output. If you do not already have it:

```bash
brew install jq
```

Start the service:

```bash
cd /Users/alex/Code/plaid-mocked-service
pnpm dev
```

Wrangler will print a local URL. The examples below assume:

```bash
export PLAID_MOCKED_SERVICE_URL="http://127.0.0.1:8787"
```

List the seeded scenarios:

```bash
curl "$PLAID_MOCKED_SERVICE_URL/v1/scenarios" | jq
```

Create a sandbox item:

```bash
curl -X POST "$PLAID_MOCKED_SERVICE_URL/v1/items" \
  -H "content-type: application/json" \
  -d '{
    "scenario_id": "household-cashflow"
  }' | jq
```

Save the `item_id` and `access_token` from the response:

```bash
export ITEM_ID="item_..."
export ACCESS_TOKEN="access-sandbox-..."
```

Fetch accounts and balances:

```bash
curl -X POST "$PLAID_MOCKED_SERVICE_URL/v1/accounts/get" \
  -H "content-type: application/json" \
  -d "{
    \"access_token\": \"$ACCESS_TOKEN\"
  }" | jq
```

Run the initial transaction sync:

```bash
curl -X POST "$PLAID_MOCKED_SERVICE_URL/v1/transactions/sync" \
  -H "content-type: application/json" \
  -d "{
    \"access_token\": \"$ACCESS_TOKEN\",
    \"cursor\": null
  }" | jq
```

Take the `next_cursor` from that response and request the next page:

```bash
export CURSOR="eyJmcmFtZV9pbmRleCI6MCwicGFnZV9pbmRleCI6MH0="

curl -X POST "$PLAID_MOCKED_SERVICE_URL/v1/transactions/sync" \
  -H "content-type: application/json" \
  -d "{
    \"access_token\": \"$ACCESS_TOKEN\",
    \"cursor\": \"$CURSOR\"
  }" | jq
```

Register a webhook URL once you have a receiver. This can be your app's local webhook endpoint exposed through ngrok, or a request bin for inspection:

```bash
export WEBHOOK_URL="https://example.ngrok.app/webhooks/plaid"

curl -X POST "$PLAID_MOCKED_SERVICE_URL/v1/webhooks/register" \
  -H "content-type: application/json" \
  -d "{
    \"access_token\": \"$ACCESS_TOKEN\",
    \"webhook_url\": \"$WEBHOOK_URL\"
  }" | jq
```

Advance the upstream state to simulate new data arriving and trigger `SYNC_UPDATES_AVAILABLE`:

```bash
curl -X POST "$PLAID_MOCKED_SERVICE_URL/v1/sandbox/items/advance" \
  -H "content-type: application/json" \
  -d "{
    \"item_id\": \"$ITEM_ID\",
    \"steps\": 1
  }" | jq
```

Then call transaction sync again with your last cursor to pull the incremental changes:

```bash
curl -X POST "$PLAID_MOCKED_SERVICE_URL/v1/transactions/sync" \
  -H "content-type: application/json" \
  -d "{
    \"access_token\": \"$ACCESS_TOKEN\",
    \"cursor\": \"$CURSOR\"
  }" | jq
```

Reset the item back to the initial frame if you want to replay the flow:

```bash
curl -X POST "$PLAID_MOCKED_SERVICE_URL/v1/sandbox/items/reset" \
  -H "content-type: application/json" \
  -d "{
    \"item_id\": \"$ITEM_ID\"
  }" | jq
```

## Scenario Model

Each scenario is a deterministic sequence of sync frames. A frame contains one or more pages. That lets candidates exercise:

- initial backfill loops
- incremental syncs
- duplicate-safe cursor handling
- replaying webhook-driven updates
- `added` / `modified` / `removed` transaction processing

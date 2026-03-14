import { Hono } from 'hono';

import type {
  AccountsGetRequest,
  AccountsGetResponse,
  AdvanceItemRequest,
  CreateItemRequest,
  RegisterWebhookRequest,
  StoredItem,
  TransactionsSyncRequest,
} from './contracts';
import { buildTransactionsSyncResponse, getAccountsForItem, getScenarioById, listScenarioSummaries } from './scenarios';

type AppEnv = {
  Bindings: CloudflareBindings;
};

async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

async function fetchState<T>(env: CloudflareBindings, path: string, init?: RequestInit): Promise<T> {
  const id = env.PLAID_MOCKED_SERVICE_STATE.idFromName('plaid-mocked-service-state');
  const stub = env.PLAID_MOCKED_SERVICE_STATE.get(id);
  const response = await stub.fetch(`https://state${path}`, init);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `State request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.get('/', (c) =>
    c.json({
      service: 'plaidMockedService',
      docs: {
        scenarios: 'GET /v1/scenarios',
        create_item: 'POST /v1/items',
        get_accounts: 'POST /v1/accounts/get',
        sync_transactions: 'POST /v1/transactions/sync',
        register_webhook: 'POST /v1/webhooks/register',
        advance_item: 'POST /v1/sandbox/items/advance',
        reset_item: 'POST /v1/sandbox/items/reset',
      },
    }),
  );

  app.get('/healthcheck', (c) =>
    c.json({
      status: 'ok',
      service: 'plaidMockedService',
      timestamp: Date.now(),
    }),
  );

  app.get('/v1/scenarios', (c) => c.json({ scenarios: listScenarioSummaries() }));

  app.post('/v1/items', async (c) => {
    const body = await readJson<CreateItemRequest>(c.req.raw);
    const item = await fetchState(c.env, '/items/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    return c.json(item, 201);
  });

  app.post('/v1/accounts/get', async (c) => {
    const body = await readJson<AccountsGetRequest>(c.req.raw);
    const item = await fetchState<StoredItem>(c.env, '/items/by-access-token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const scenario = getScenarioById(item.scenario_id);

    if (!scenario) {
      return c.json({ error: `Unknown scenario_id "${item.scenario_id}".` }, 500);
    }

    return c.json({
      item: {
        item_id: item.item_id,
        scenario_id: item.scenario_id,
        institution_name: item.institution_name,
        available_frame_index: item.available_frame_index,
        updated_at: item.updated_at,
      },
      accounts: getAccountsForItem(item, scenario),
    } satisfies AccountsGetResponse);
  });

  app.post('/v1/transactions/sync', async (c) => {
    const body = await readJson<TransactionsSyncRequest>(c.req.raw);
    const item = await fetchState<StoredItem>(c.env, '/items/by-access-token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ access_token: body.access_token }),
    });
    const scenario = getScenarioById(item.scenario_id);

    if (!scenario) {
      return c.json({ error: `Unknown scenario_id "${item.scenario_id}".` }, 500);
    }

    try {
      return c.json(buildTransactionsSyncResponse(item, scenario, body.cursor));
    } catch (error) {
      return c.json(
        {
          error: error instanceof Error ? error.message : 'Unable to build sync response.',
        },
        400,
      );
    }
  });

  app.post('/v1/webhooks/register', async (c) => {
    const body = await readJson<RegisterWebhookRequest>(c.req.raw);
    const item = await fetchState<StoredItem>(c.env, '/items/register-webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    return c.json({
      item_id: item.item_id,
      webhook_urls: item.webhook_urls,
      updated_at: item.updated_at,
    });
  });

  app.get('/v1/items/:itemId', async (c) => {
    const item = await fetchState<StoredItem>(c.env, `/items/${c.req.param('itemId')}`, {
      method: 'GET',
    });

    return c.json(item);
  });

  app.post('/v1/sandbox/items/advance', async (c) => {
    const body = await readJson<AdvanceItemRequest>(c.req.raw);
    const result = await fetchState(c.env, '/items/advance', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    return c.json(result);
  });

  app.post('/v1/sandbox/items/reset', async (c) => {
    const body = await c.req.json();
    const result = await fetchState(c.env, '/items/reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    return c.json(result);
  });

  app.onError((error, c) => {
    console.error('Request failed', error);
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Unexpected error',
      },
      500,
    );
  });

  return app;
}

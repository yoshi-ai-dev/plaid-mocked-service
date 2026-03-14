import type {
  AdvanceItemRequest,
  AdvanceItemResponse,
  CreateItemRequest,
  CreateItemResponse,
  RegisterWebhookRequest,
  ResetItemRequest,
  StoredItem,
  WebhookPayload,
} from './contracts';
import { countFrameTransactions, getScenarioById } from './scenarios';

const ITEM_PREFIX = 'item:';
const ACCESS_TOKEN_PREFIX = 'access-token:';

type ErrorResponse = {
  error: string;
};

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return Response.json(body, init);
}

function notFound(message: string): Response {
  return jsonResponse({ error: message } satisfies ErrorResponse, { status: 404 });
}

function badRequest(message: string): Response {
  return jsonResponse({ error: message } satisfies ErrorResponse, { status: 400 });
}

async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

export class PlaidMockedServiceState {
  constructor(
    private readonly state: DurableObjectState,
    env: CloudflareBindings,
  ) {
    void env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/items/create') {
      return this.createItem(await readJson<CreateItemRequest>(request));
    }

    if (request.method === 'POST' && url.pathname === '/items/by-access-token') {
      const body = await readJson<{ access_token: string }>(request);
      return this.getItemByAccessToken(body.access_token);
    }

    if (request.method === 'POST' && url.pathname === '/items/register-webhook') {
      return this.registerWebhook(await readJson<RegisterWebhookRequest>(request));
    }

    if (request.method === 'POST' && url.pathname === '/items/advance') {
      return this.advanceItem(await readJson<AdvanceItemRequest>(request));
    }

    if (request.method === 'POST' && url.pathname === '/items/reset') {
      return this.resetItem(await readJson<ResetItemRequest>(request));
    }

    if (request.method === 'GET' && url.pathname.startsWith('/items/')) {
      return this.getItemById(url.pathname.replace('/items/', ''));
    }

    return notFound(`No Durable Object route for ${request.method} ${url.pathname}`);
  }

  private async createItem(body: CreateItemRequest): Promise<Response> {
    const scenario = getScenarioById(body.scenario_id ?? 'household-cashflow');
    if (!scenario) {
      return badRequest(`Unknown scenario_id "${body.scenario_id}".`);
    }

    const itemId = `item_${crypto.randomUUID()}`;
    const accessToken = `access-sandbox-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const item: StoredItem = {
      item_id: itemId,
      access_token: accessToken,
      scenario_id: scenario.scenario_id,
      institution_name: scenario.institution_name,
      webhook_urls: body.webhook_url ? [body.webhook_url] : [],
      available_frame_index: 0,
      created_at: now,
      updated_at: now,
    };

    await this.state.storage.put(`${ITEM_PREFIX}${itemId}`, item);
    await this.state.storage.put(`${ACCESS_TOKEN_PREFIX}${accessToken}`, itemId);

    return jsonResponse({
      item_id: item.item_id,
      access_token: item.access_token,
      institution_name: item.institution_name,
      scenario_id: item.scenario_id,
      available_frame_index: item.available_frame_index,
    } satisfies CreateItemResponse);
  }

  private async getItemById(itemId: string): Promise<Response> {
    const item = await this.state.storage.get<StoredItem>(`${ITEM_PREFIX}${itemId}`);
    if (!item) {
      return notFound(`Unknown item_id "${itemId}".`);
    }

    return jsonResponse(item);
  }

  private async getItemByAccessToken(accessToken: string): Promise<Response> {
    const itemId = await this.state.storage.get<string>(`${ACCESS_TOKEN_PREFIX}${accessToken}`);
    if (!itemId) {
      return notFound('Unknown access token.');
    }

    return this.getItemById(itemId);
  }

  private async registerWebhook(body: RegisterWebhookRequest): Promise<Response> {
    const item = await this.lookupRequiredItem(body.access_token);
    if (item instanceof Response) {
      return item;
    }

    const nextWebhookUrls = [...new Set([...item.webhook_urls, body.webhook_url])];
    const nextItem: StoredItem = {
      ...item,
      webhook_urls: nextWebhookUrls,
      updated_at: new Date().toISOString(),
    };

    await this.state.storage.put(`${ITEM_PREFIX}${item.item_id}`, nextItem);
    return jsonResponse(nextItem);
  }

  private async resetItem(body: ResetItemRequest): Promise<Response> {
    const item = await this.state.storage.get<StoredItem>(`${ITEM_PREFIX}${body.item_id}`);
    if (!item) {
      return notFound(`Unknown item_id "${body.item_id}".`);
    }

    const nextItem: StoredItem = {
      ...item,
      available_frame_index: 0,
      updated_at: new Date().toISOString(),
    };

    await this.state.storage.put(`${ITEM_PREFIX}${item.item_id}`, nextItem);
    return jsonResponse(nextItem);
  }

  private async advanceItem(body: AdvanceItemRequest): Promise<Response> {
    const item = await this.state.storage.get<StoredItem>(`${ITEM_PREFIX}${body.item_id}`);
    if (!item) {
      return notFound(`Unknown item_id "${body.item_id}".`);
    }

    const scenario = getScenarioById(item.scenario_id);
    if (!scenario) {
      return badRequest(`Scenario "${item.scenario_id}" is not configured.`);
    }

    const nextFrameIndex = Math.min(
      item.available_frame_index + Math.max(1, body.steps ?? 1),
      scenario.frames.length - 1,
    );
    const nextItem: StoredItem = {
      ...item,
      available_frame_index: nextFrameIndex,
      updated_at: new Date().toISOString(),
    };

    await this.state.storage.put(`${ITEM_PREFIX}${item.item_id}`, nextItem);

    const webhookPayloads: WebhookPayload[] = [];
    const deliveries: AdvanceItemResponse['deliveries'] = [];

    for (let frameIndex = item.available_frame_index + 1; frameIndex <= nextFrameIndex; frameIndex += 1) {
      webhookPayloads.push({
        webhook_type: 'TRANSACTIONS',
        webhook_code: 'SYNC_UPDATES_AVAILABLE',
        item_id: item.item_id,
        new_transactions: countFrameTransactions(scenario, frameIndex),
        environment: 'sandbox',
      });
    }

    for (const webhookPayload of webhookPayloads) {
      for (const webhookUrl of nextItem.webhook_urls) {
        try {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'user-agent': 'plaid-mocked-service/0.1',
            },
            body: JSON.stringify(webhookPayload),
          });

          deliveries.push({
            webhook_url: webhookUrl,
            ok: response.ok,
            status: response.status,
          });
        } catch {
          deliveries.push({
            webhook_url: webhookUrl,
            ok: false,
            status: null,
          });
        }
      }
    }

    return jsonResponse({
      item: {
        item_id: nextItem.item_id,
        scenario_id: nextItem.scenario_id,
        available_frame_index: nextItem.available_frame_index,
        updated_at: nextItem.updated_at,
      },
      webhook_payloads: webhookPayloads,
      deliveries,
    } satisfies AdvanceItemResponse);
  }

  private async lookupRequiredItem(accessToken: string): Promise<StoredItem | Response> {
    const itemId = await this.state.storage.get<string>(`${ACCESS_TOKEN_PREFIX}${accessToken}`);
    if (!itemId) {
      return notFound('Unknown access token.');
    }

    const item = await this.state.storage.get<StoredItem>(`${ITEM_PREFIX}${itemId}`);
    if (!item) {
      return notFound('No item found for access token.');
    }

    return item;
  }
}

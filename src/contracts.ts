export type Money = {
  available: number | null;
  current: number;
  iso_currency_code: 'USD';
};

export type Account = {
  account_id: string;
  item_id: string;
  name: string;
  official_name: string | null;
  type: 'depository' | 'credit';
  subtype: 'checking' | 'savings' | 'credit card';
  mask: string;
  balances: Money;
};

export type Transaction = {
  transaction_id: string;
  account_id: string;
  amount: number;
  iso_currency_code: 'USD';
  name: string;
  merchant_name: string | null;
  date: string;
  pending: boolean;
  category: string[];
};

export type RemovedTransaction = {
  transaction_id: string;
};

export type BalancePatch = Record<
  string,
  {
    available: number | null;
    current: number;
  }
>;

export type SyncPageDefinition = {
  added: Transaction[];
  modified: Transaction[];
  removed: RemovedTransaction[];
  balance_patch?: BalancePatch;
};

export type ScenarioFrame = {
  frame_id: string;
  description: string;
  pages: SyncPageDefinition[];
};

export type ScenarioDefinition = {
  scenario_id: string;
  name: string;
  description: string;
  institution_name: string;
  accounts: Omit<Account, 'item_id'>[];
  frames: ScenarioFrame[];
};

export type ScenarioSummary = Pick<
  ScenarioDefinition,
  'scenario_id' | 'name' | 'description' | 'institution_name'
> & {
  frame_count: number;
};

export type CursorState = {
  frame_index: number;
  page_index: number;
};

export type StoredItem = {
  item_id: string;
  access_token: string;
  scenario_id: string;
  institution_name: string;
  webhook_urls: string[];
  available_frame_index: number;
  created_at: string;
  updated_at: string;
};

export type CreateItemRequest = {
  scenario_id?: string;
  webhook_url?: string | null;
};

export type CreateItemResponse = {
  item_id: string;
  access_token: string;
  institution_name: string;
  scenario_id: string;
  available_frame_index: number;
};

export type AccountsGetRequest = {
  access_token: string;
};

export type AccountsGetResponse = {
  item: Pick<StoredItem, 'item_id' | 'scenario_id' | 'institution_name' | 'available_frame_index' | 'updated_at'>;
  accounts: Account[];
};

export type TransactionsSyncRequest = {
  access_token: string;
  cursor?: string | null;
};

export type TransactionsSyncResponse = {
  accounts: Account[];
  added: Transaction[];
  modified: Transaction[];
  removed: RemovedTransaction[];
  has_more: boolean;
  next_cursor: string | null;
  cursor: string | null;
  item: Pick<StoredItem, 'item_id' | 'scenario_id' | 'updated_at'>;
};

export type RegisterWebhookRequest = {
  access_token: string;
  webhook_url: string;
};

export type AdvanceItemRequest = {
  item_id: string;
  steps?: number;
};

export type WebhookPayload = {
  webhook_type: 'TRANSACTIONS';
  webhook_code: 'SYNC_UPDATES_AVAILABLE';
  item_id: string;
  new_transactions: number;
  environment: 'sandbox';
};

export type AdvanceItemResponse = {
  item: Pick<StoredItem, 'item_id' | 'scenario_id' | 'available_frame_index' | 'updated_at'>;
  webhook_payloads: WebhookPayload[];
  deliveries: Array<{
    webhook_url: string;
    ok: boolean;
    status: number | null;
  }>;
};

export type ResetItemRequest = {
  item_id: string;
};

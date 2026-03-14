import type {
  Account,
  BalancePatch,
  CursorState,
  ScenarioDefinition,
  ScenarioSummary,
  StoredItem,
  SyncPageDefinition,
  TransactionsSyncResponse,
} from './contracts';

const accounts = (itemId: string, baseAccounts: ScenarioDefinition['accounts'], patch: BalancePatch): Account[] =>
  baseAccounts.map((account) => {
    const nextBalance = patch[account.account_id] ?? account.balances;
    return {
      ...account,
      item_id: itemId,
      balances: {
        available: nextBalance.available,
        current: nextBalance.current,
        iso_currency_code: 'USD',
      },
    };
  });

export const SCENARIOS: ScenarioDefinition[] = [
  {
    scenario_id: 'household-cashflow',
    name: 'Household Cashflow',
    description: 'Checking and savings accounts with payroll, rent, groceries, and a few incremental updates.',
    institution_name: 'Plaid Mock Credit Union',
    accounts: [
      {
        account_id: 'acc_checking_primary',
        name: 'Primary Checking',
        official_name: 'Plaid Mock Checking',
        type: 'depository',
        subtype: 'checking',
        mask: '0001',
        balances: {
          available: 2840.12,
          current: 2840.12,
          iso_currency_code: 'USD',
        },
      },
      {
        account_id: 'acc_savings_primary',
        name: 'Rainy Day Savings',
        official_name: 'Plaid Mock Savings',
        type: 'depository',
        subtype: 'savings',
        mask: '0002',
        balances: {
          available: 12450,
          current: 12450,
          iso_currency_code: 'USD',
        },
      },
    ],
    frames: [
      {
        frame_id: 'initial-backfill',
        description: 'Initial item backfill with two sync pages.',
        pages: [
          {
            balance_patch: {
              acc_checking_primary: { available: 2840.12, current: 2840.12 },
              acc_savings_primary: { available: 12450, current: 12450 },
            },
            added: [
              {
                transaction_id: 'tx_payroll_001',
                account_id: 'acc_checking_primary',
                amount: -3200,
                iso_currency_code: 'USD',
                name: 'Acme Payroll',
                merchant_name: 'Acme Corp',
                date: '2026-02-28',
                pending: false,
                category: ['Income', 'Payroll'],
              },
              {
                transaction_id: 'tx_rent_001',
                account_id: 'acc_checking_primary',
                amount: 1850,
                iso_currency_code: 'USD',
                name: 'Landlord ACH',
                merchant_name: null,
                date: '2026-03-01',
                pending: false,
                category: ['Transfer', 'Rent'],
              },
              {
                transaction_id: 'tx_grocery_001',
                account_id: 'acc_checking_primary',
                amount: 126.41,
                iso_currency_code: 'USD',
                name: 'Sunset Market',
                merchant_name: 'Sunset Market',
                date: '2026-03-02',
                pending: false,
                category: ['Shops', 'Groceries'],
              },
            ],
            modified: [],
            removed: [],
          },
          {
            balance_patch: {
              acc_checking_primary: { available: 2513.71, current: 2513.71 },
            },
            added: [
              {
                transaction_id: 'tx_transfer_001',
                account_id: 'acc_checking_primary',
                amount: 300,
                iso_currency_code: 'USD',
                name: 'Transfer to Savings',
                merchant_name: null,
                date: '2026-03-03',
                pending: false,
                category: ['Transfer', 'Savings'],
              },
              {
                transaction_id: 'tx_interest_001',
                account_id: 'acc_savings_primary',
                amount: -2.14,
                iso_currency_code: 'USD',
                name: 'Interest Credit',
                merchant_name: null,
                date: '2026-03-03',
                pending: false,
                category: ['Income', 'Interest'],
              },
            ],
            modified: [],
            removed: [],
          },
        ],
      },
      {
        frame_id: 'daily-update',
        description: 'A later sync with new spend and a posted pending transaction.',
        pages: [
          {
            balance_patch: {
              acc_checking_primary: { available: 2249.18, current: 2249.18 },
            },
            added: [
              {
                transaction_id: 'tx_gas_001',
                account_id: 'acc_checking_primary',
                amount: 48.29,
                iso_currency_code: 'USD',
                name: 'Northwind Fuel',
                merchant_name: 'Northwind Fuel',
                date: '2026-03-04',
                pending: false,
                category: ['Transportation', 'Gas'],
              },
              {
                transaction_id: 'tx_restaurant_001',
                account_id: 'acc_checking_primary',
                amount: 27.4,
                iso_currency_code: 'USD',
                name: 'Soba House',
                merchant_name: 'Soba House',
                date: '2026-03-04',
                pending: true,
                category: ['Food and Drink', 'Restaurants'],
              },
            ],
            modified: [],
            removed: [],
          },
          {
            balance_patch: {
              acc_checking_primary: { available: 2221.78, current: 2221.78 },
            },
            added: [],
            modified: [
              {
                transaction_id: 'tx_restaurant_001',
                account_id: 'acc_checking_primary',
                amount: 27.4,
                iso_currency_code: 'USD',
                name: 'Soba House',
                merchant_name: 'Soba House',
                date: '2026-03-04',
                pending: false,
                category: ['Food and Drink', 'Restaurants'],
              },
            ],
            removed: [],
          },
        ],
      },
      {
        frame_id: 'cleanup-update',
        description: 'Simulated cleanup where a duplicate pending hold is removed and a new payroll lands.',
        pages: [
          {
            balance_patch: {
              acc_checking_primary: { available: 5421.78, current: 5421.78 },
            },
            added: [
              {
                transaction_id: 'tx_payroll_002',
                account_id: 'acc_checking_primary',
                amount: -3200,
                iso_currency_code: 'USD',
                name: 'Acme Payroll',
                merchant_name: 'Acme Corp',
                date: '2026-03-15',
                pending: false,
                category: ['Income', 'Payroll'],
              },
            ],
            modified: [],
            removed: [
              {
                transaction_id: 'tx_restaurant_hold_001',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    scenario_id: 'credit-card-heavy',
    name: 'Credit Card Heavy',
    description: 'Checking plus credit with card transactions, payment, and statement-like updates.',
    institution_name: 'Plaid Mock National Bank',
    accounts: [
      {
        account_id: 'acc_checking_joint',
        name: 'Joint Checking',
        official_name: 'Plaid Mock Joint Checking',
        type: 'depository',
        subtype: 'checking',
        mask: '1111',
        balances: {
          available: 6040.56,
          current: 6040.56,
          iso_currency_code: 'USD',
        },
      },
      {
        account_id: 'acc_credit_rewards',
        name: 'Rewards Visa',
        official_name: 'Plaid Mock Rewards Visa',
        type: 'credit',
        subtype: 'credit card',
        mask: '2222',
        balances: {
          available: null,
          current: 841.33,
          iso_currency_code: 'USD',
        },
      },
    ],
    frames: [
      {
        frame_id: 'initial-backfill',
        description: 'Initial card-heavy item backfill.',
        pages: [
          {
            balance_patch: {
              acc_checking_joint: { available: 6040.56, current: 6040.56 },
              acc_credit_rewards: { available: null, current: 841.33 },
            },
            added: [
              {
                transaction_id: 'tx_cc_grocery_001',
                account_id: 'acc_credit_rewards',
                amount: 138.22,
                iso_currency_code: 'USD',
                name: 'Harbor Grocery',
                merchant_name: 'Harbor Grocery',
                date: '2026-03-01',
                pending: false,
                category: ['Shops', 'Groceries'],
              },
              {
                transaction_id: 'tx_cc_travel_001',
                account_id: 'acc_credit_rewards',
                amount: 412.7,
                iso_currency_code: 'USD',
                name: 'Orbit Air',
                merchant_name: 'Orbit Air',
                date: '2026-03-02',
                pending: false,
                category: ['Travel', 'Airlines'],
              },
            ],
            modified: [],
            removed: [],
          },
        ],
      },
      {
        frame_id: 'card-payment',
        description: 'Card payment and one additional card swipe.',
        pages: [
          {
            balance_patch: {
              acc_checking_joint: { available: 5540.56, current: 5540.56 },
              acc_credit_rewards: { available: null, current: 421.33 },
            },
            added: [
              {
                transaction_id: 'tx_cc_coffee_001',
                account_id: 'acc_credit_rewards',
                amount: 8.75,
                iso_currency_code: 'USD',
                name: 'Morning Coffee',
                merchant_name: 'Morning Coffee',
                date: '2026-03-05',
                pending: false,
                category: ['Food and Drink', 'Coffee'],
              },
              {
                transaction_id: 'tx_payment_001',
                account_id: 'acc_checking_joint',
                amount: 420,
                iso_currency_code: 'USD',
                name: 'Credit Card Payment',
                merchant_name: null,
                date: '2026-03-05',
                pending: false,
                category: ['Transfer', 'Credit Card Payment'],
              },
            ],
            modified: [],
            removed: [],
          },
        ],
      },
    ],
  },
];

export function listScenarioSummaries(): ScenarioSummary[] {
  return SCENARIOS.map((scenario) => ({
    scenario_id: scenario.scenario_id,
    name: scenario.name,
    description: scenario.description,
    institution_name: scenario.institution_name,
    frame_count: scenario.frames.length,
  }));
}

export function getScenarioById(scenarioId: string): ScenarioDefinition | undefined {
  return SCENARIOS.find((scenario) => scenario.scenario_id === scenarioId);
}

export function encodeCursor(cursor: CursorState): string {
  return btoa(JSON.stringify(cursor));
}

export function decodeCursor(cursor: string): CursorState {
  const parsed = JSON.parse(atob(cursor)) as Partial<CursorState>;
  if (typeof parsed.frame_index !== 'number' || typeof parsed.page_index !== 'number') {
    throw new Error('Cursor payload is invalid.');
  }

  return {
    frame_index: parsed.frame_index,
    page_index: parsed.page_index,
  };
}

function getBalancePatchForItem(item: StoredItem, scenario: ScenarioDefinition): BalancePatch {
  const balances: BalancePatch = Object.fromEntries(
    scenario.accounts.map((account) => [
      account.account_id,
      {
        available: account.balances.available,
        current: account.balances.current,
      },
    ]),
  );

  for (let frameIndex = 0; frameIndex <= item.available_frame_index; frameIndex += 1) {
    const frame = scenario.frames[frameIndex];
    for (const page of frame.pages) {
      if (!page.balance_patch) {
        continue;
      }

      for (const [accountId, nextBalance] of Object.entries(page.balance_patch)) {
        balances[accountId] = nextBalance;
      }
    }
  }

  return balances;
}

export function getAccountsForItem(item: StoredItem, scenario: ScenarioDefinition): Account[] {
  return accounts(item.item_id, scenario.accounts, getBalancePatchForItem(item, scenario));
}

function getNextPagePosition(
  current: CursorState | null,
  scenario: ScenarioDefinition,
  availableFrameIndex: number,
): CursorState | null {
  if (availableFrameIndex < 0) {
    return null;
  }

  if (current === null) {
    return { frame_index: 0, page_index: 0 };
  }

  const currentFrame = scenario.frames[current.frame_index];
  if (!currentFrame) {
    return null;
  }

  if (current.page_index + 1 < currentFrame.pages.length && current.frame_index <= availableFrameIndex) {
    return {
      frame_index: current.frame_index,
      page_index: current.page_index + 1,
    };
  }

  const nextFrameIndex = current.frame_index + 1;
  if (nextFrameIndex <= availableFrameIndex && scenario.frames[nextFrameIndex]) {
    return {
      frame_index: nextFrameIndex,
      page_index: 0,
    };
  }

  return null;
}

function hasAdditionalPage(current: CursorState, scenario: ScenarioDefinition, availableFrameIndex: number): boolean {
  return getNextPagePosition(current, scenario, availableFrameIndex) !== null;
}

export function buildTransactionsSyncResponse(
  item: StoredItem,
  scenario: ScenarioDefinition,
  rawCursor: string | null | undefined,
): TransactionsSyncResponse {
  const currentCursor = rawCursor ? decodeCursor(rawCursor) : null;
  const pagePosition = getNextPagePosition(currentCursor, scenario, item.available_frame_index);
  const itemSummary = {
    item_id: item.item_id,
    scenario_id: item.scenario_id,
    updated_at: item.updated_at,
  };
  const accountsForItem = getAccountsForItem(item, scenario);

  if (pagePosition === null) {
    return {
      accounts: accountsForItem,
      added: [],
      modified: [],
      removed: [],
      has_more: false,
      next_cursor: rawCursor ?? null,
      cursor: rawCursor ?? null,
      item: itemSummary,
    };
  }

  const frame = scenario.frames[pagePosition.frame_index];
  const page: SyncPageDefinition | undefined = frame?.pages[pagePosition.page_index];
  if (!frame || !page) {
    throw new Error('Cursor points to a page that does not exist.');
  }

  const nextCursor = encodeCursor(pagePosition);

  return {
    accounts: accountsForItem,
    added: page.added,
    modified: page.modified,
    removed: page.removed,
    has_more: hasAdditionalPage(pagePosition, scenario, item.available_frame_index),
    next_cursor: nextCursor,
    cursor: nextCursor,
    item: itemSummary,
  };
}

export function countFrameTransactions(scenario: ScenarioDefinition, frameIndex: number): number {
  const frame = scenario.frames[frameIndex];
  if (!frame) {
    return 0;
  }

  return frame.pages.reduce((sum, page) => sum + page.added.length + page.modified.length + page.removed.length, 0);
}

import { describe, expect, it } from 'vitest';

import type { ScenarioDefinition, StoredItem } from '../contracts';
import { buildTransactionsSyncResponse, decodeCursor, getScenarioById } from '../scenarios';

function getRequiredScenario(): ScenarioDefinition {
  const scenario = getScenarioById('household-cashflow');
  if (!scenario) {
    throw new Error('Expected household-cashflow scenario to be configured.');
  }

  return scenario;
}

const scenario = getRequiredScenario();

function buildItem(availableFrameIndex: number): StoredItem {
  return {
    item_id: 'item_test',
    access_token: 'access-sandbox-test',
    scenario_id: scenario.scenario_id,
    institution_name: scenario.institution_name,
    webhook_urls: [],
    available_frame_index: availableFrameIndex,
    created_at: '2026-03-13T00:00:00.000Z',
    updated_at: '2026-03-13T00:00:00.000Z',
  };
}

describe('buildTransactionsSyncResponse', () => {
  it('returns the first page when no cursor is present', () => {
    const response = buildTransactionsSyncResponse(buildItem(0), scenario, null);

    expect(response.added).toHaveLength(3);
    expect(response.has_more).toBe(true);
    expect(response.next_cursor).toBeTruthy();
  });

  it('advances to the next frame once new data becomes available', () => {
    const first = buildTransactionsSyncResponse(buildItem(0), scenario, null);
    const second = buildTransactionsSyncResponse(buildItem(0), scenario, first.next_cursor);
    const noNewData = buildTransactionsSyncResponse(buildItem(0), scenario, second.next_cursor);
    const afterAdvance = buildTransactionsSyncResponse(buildItem(1), scenario, second.next_cursor);

    expect(second.added).toHaveLength(2);
    expect(noNewData.added).toHaveLength(0);
    expect(afterAdvance.added).toHaveLength(2);
  });

  it('encodes cursors as the last delivered page position', () => {
    const first = buildTransactionsSyncResponse(buildItem(0), scenario, null);
    const cursor = decodeCursor(first.next_cursor as string);

    expect(cursor).toEqual({
      frame_index: 0,
      page_index: 0,
    });
  });
});

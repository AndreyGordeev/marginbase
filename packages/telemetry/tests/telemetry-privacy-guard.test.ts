import { describe, expect, it } from 'vitest';
import { LocalTelemetryQueue, createTelemetryEvent } from '../src';

describe('telemetry privacy and validation guards', () => {
  it('rejects suspicious monetary-looking keys in event properties', () => {
    const queue = new LocalTelemetryQueue();
    const forbiddenKeys = [
      'amountMinor',
      'RevenueTotal',
      'variable_cost_minor',
      'unitPriceMinor',
      'moneyValue',
      'grossProfitMinor',
      'contributionMarginPct',
      'cashBuffer'
    ];

    for (const key of forbiddenKeys) {
      const event = createTelemetryEvent('module_opened', { moduleId: 'profit' });
      event.properties = { moduleId: 'profit', [key]: '12345' } as Record<string, string | boolean>;

      const result = queue.enqueue(event);
      expect(result.accepted).toBe(false);
      expect(queue.size()).toBe(0);
    }
  });

  it('rejects unknown telemetry event names at runtime', () => {
    const queue = new LocalTelemetryQueue();
    const event = createTelemetryEvent('module_opened', { moduleId: 'profit' });
    event.name = 'scenario_money_dump' as unknown as typeof event.name;

    const result = queue.enqueue(event);
    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/allowlist/i);
  });

  it('rejects malformed occurredAt timestamps', () => {
    const queue = new LocalTelemetryQueue();
    const event = createTelemetryEvent('module_opened', { moduleId: 'profit' });
    event.occurredAt = '20260304';

    const result = queue.enqueue(event);
    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/occurredAt/i);
  });

  it('rejects invalid module identifiers', () => {
    const queue = new LocalTelemetryQueue();
    const event = createTelemetryEvent('module_opened', { moduleId: 'profit' });
    event.properties = { moduleId: 'pnl' } as Record<string, string | boolean>;

    const result = queue.enqueue(event);
    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/moduleId/i);
  });
});

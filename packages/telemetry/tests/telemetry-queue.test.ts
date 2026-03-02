import { describe, expect, it } from 'vitest';
import {
  LocalTelemetryQueue,
  TELEMETRY_EVENT_ALLOWLIST,
  createTelemetryEvent
} from '../src';

describe('telemetry queue', () => {
  it('accepts only allowlisted events and fields', () => {
    const queue = new LocalTelemetryQueue();

    const accepted = queue.enqueue(createTelemetryEvent('module_opened', { moduleId: 'profit' }));
    expect(accepted.accepted).toBe(true);

    const rejected = queue.enqueue(
      createTelemetryEvent('module_opened', { moduleId: 'profit', revenueMinor: '1000' } as Record<string, string>)
    );
    expect(rejected.accepted).toBe(false);
    expect(rejected.reason).toMatch(/not allowed|forbidden/i);
  });

  it('rejects disallowed payload field types', () => {
    const queue = new LocalTelemetryQueue();
    const event = createTelemetryEvent('import_failed', { reasonCode: 'JSON_INVALID' });
    event.properties = { reasonCode: 123 as unknown as string };

    const result = queue.enqueue(event);
    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/string or boolean/i);
  });

  it('enforces queue size cap by compacting oldest events', () => {
    const queue = new LocalTelemetryQueue({ queueSizeCapBytes: 350, batchSizeCapBytes: 350 });

    for (let index = 0; index < 10; index += 1) {
      queue.enqueue(createTelemetryEvent('import_failed', { reasonCode: `code_${index}` }));
    }

    expect(queue.size()).toBeLessThan(10);
    expect(queue.snapshot().length).toBe(queue.size());
  });

  it('flushes structured batches under size cap', () => {
    const queue = new LocalTelemetryQueue({ queueSizeCapBytes: 10_000, batchSizeCapBytes: 450 });

    for (let index = 0; index < 6; index += 1) {
      queue.enqueue(createTelemetryEvent('import_failed', { reasonCode: `error_${index}` }));
    }

    const flushed = queue.flushBatch(10);

    expect(flushed.batch.schemaVersion).toBe(1);
    expect(flushed.batch.generatedAt).toBeTruthy();
    expect(flushed.batch.events.length).toBeGreaterThan(0);
    expect(flushed.batch.events.length).toBeLessThanOrEqual(6);
    expect(flushed.bytes).toBeLessThanOrEqual(450);
    expect(queue.size()).toBe(6 - flushed.batch.events.length);
  });

  it('exposes expected telemetry event allowlist', () => {
    expect(TELEMETRY_EVENT_ALLOWLIST).toEqual(
      expect.arrayContaining([
        'auth_login_success',
        'auth_login_failure',
        'scenario_saved',
        'export_completed',
        'import_failed'
      ])
    );
  });
});

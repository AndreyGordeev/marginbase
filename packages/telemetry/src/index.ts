export const TELEMETRY_EVENT_ALLOWLIST = [
	'app_opened',
	'auth_login_success',
	'auth_login_failure',
	'trial_started',
	'subscription_purchase_started',
	'subscription_purchase_success',
	'subscription_purchase_failed',
	'module_opened',
	'embed_opened',
	'embed_cta_clicked',
	'scenario_created',
	'scenario_saved',
	'scenario_deleted',
	'export_completed',
	'import_completed',
	'import_failed',
	'app_crash'
] as const;

export type TelemetryEventName = (typeof TELEMETRY_EVENT_ALLOWLIST)[number];
export type TelemetryModuleId = 'profit' | 'breakeven' | 'cashflow';

export interface TelemetryEvent {
	id: string;
	name: TelemetryEventName;
	occurredAt: string;
	properties: Record<string, string | boolean>;
}

export interface TelemetryBatch {
	schemaVersion: 1;
	generatedAt: string;
	events: TelemetryEvent[];
}

export interface TelemetryQueueConfig {
	queueSizeCapBytes: number;
	batchSizeCapBytes: number;
}

export interface QueueEnqueueResult {
	accepted: boolean;
	reason?: string;
}

export interface QueueFlushResult {
	batch: TelemetryBatch;
	bytes: number;
	dequeued: number;
}

const DEFAULT_QUEUE_CONFIG: TelemetryQueueConfig = {
	queueSizeCapBytes: 128 * 1024,
	batchSizeCapBytes: 32 * 1024
};

const EVENT_ALLOWED_KEYS: Readonly<Record<TelemetryEventName, readonly string[]>> = {
	app_opened: [],
	auth_login_success: [],
	auth_login_failure: ['reasonCode'],
	trial_started: [],
	subscription_purchase_started: [],
	subscription_purchase_success: [],
	subscription_purchase_failed: ['reasonCode'],
	module_opened: ['moduleId'],
	embed_opened: ['moduleId', 'poweredBy'],
	embed_cta_clicked: ['moduleId'],
	scenario_created: ['moduleId'],
	scenario_saved: ['moduleId'],
	scenario_deleted: ['moduleId'],
	export_completed: [],
	import_completed: [],
	import_failed: ['reasonCode'],
	app_crash: ['reasonCode']
};

const FORBIDDEN_MONETARY_PATTERNS = ['amount', 'revenue', 'cost', 'price', 'money', 'profit', 'margin', 'cash'];

const isIsoDate = (value: string): boolean => {
	const parsed = new Date(value);
	return !Number.isNaN(parsed.getTime()) && value.includes('T');
};

const toBytes = (value: unknown): number => {
	return Buffer.byteLength(JSON.stringify(value), 'utf8');
};

const containsForbiddenMonetaryKey = (key: string): boolean => {
	const lowered = key.toLowerCase();
	return FORBIDDEN_MONETARY_PATTERNS.some((pattern) => lowered.includes(pattern));
};

const validateProperties = (name: TelemetryEventName, properties: Record<string, unknown>): string | null => {
	const allowedKeys = new Set(EVENT_ALLOWED_KEYS[name]);

	for (const [key, value] of Object.entries(properties)) {
		if (!allowedKeys.has(key)) {
			return `Property ${key} is not allowed for event ${name}.`;
		}

		if (containsForbiddenMonetaryKey(key)) {
			return `Property ${key} is forbidden by telemetry allowlist.`;
		}

		if (typeof value !== 'string' && typeof value !== 'boolean') {
			return `Property ${key} must be string or boolean.`;
		}
	}

	if ('moduleId' in properties) {
		const moduleId = properties.moduleId;
		if (moduleId !== 'profit' && moduleId !== 'breakeven' && moduleId !== 'cashflow') {
			return 'moduleId must be one of profit, breakeven, cashflow.';
		}
	}

	return null;
};

const validateEvent = (event: TelemetryEvent): string | null => {
	if (!TELEMETRY_EVENT_ALLOWLIST.includes(event.name)) {
		return `Event ${event.name} is not in telemetry allowlist.`;
	}

	if (!event.id.trim()) {
		return 'Event id is required.';
	}

	if (!isIsoDate(event.occurredAt)) {
		return 'occurredAt must be ISO datetime.';
	}

	return validateProperties(event.name, event.properties);
};

export const createTelemetryEvent = (
	name: TelemetryEventName,
	properties: Record<string, string | boolean> = {},
	now = new Date()
): TelemetryEvent => {
	return {
		id: `${name}_${now.getTime()}_${Math.random().toString(36).slice(2, 10)}`,
		name,
		occurredAt: now.toISOString(),
		properties
	};
};

export class LocalTelemetryQueue {
	private readonly queue: TelemetryEvent[] = [];
	private readonly config: TelemetryQueueConfig;

	public constructor(config: Partial<TelemetryQueueConfig> = {}) {
		this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
	}

	public size(): number {
		return this.queue.length;
	}

	public snapshot(): TelemetryEvent[] {
		return [...this.queue];
	}

	public enqueue(event: TelemetryEvent): QueueEnqueueResult {
		const validationError = validateEvent(event);

		if (validationError) {
			return { accepted: false, reason: validationError };
		}

		this.queue.push(event);
		this.compactToCap();

		return { accepted: true };
	}

	public flushBatch(maxEvents = 50): QueueFlushResult {
		const selected: TelemetryEvent[] = [];

		for (const event of this.queue) {
			if (selected.length >= maxEvents) {
				break;
			}

			const candidate = [...selected, event];
			const candidateBatch: TelemetryBatch = {
				schemaVersion: 1,
				generatedAt: new Date().toISOString(),
				events: candidate
			};

			if (toBytes(candidateBatch) > this.config.batchSizeCapBytes) {
				break;
			}

			selected.push(event);
		}

		const batch: TelemetryBatch = {
			schemaVersion: 1,
			generatedAt: new Date().toISOString(),
			events: selected
		};

		this.queue.splice(0, selected.length);

		return {
			batch,
			bytes: toBytes(batch),
			dequeued: selected.length
		};
	}

	private compactToCap(): void {
		while (toBytes(this.queue) > this.config.queueSizeCapBytes && this.queue.length > 0) {
			this.queue.shift();
		}
	}
}


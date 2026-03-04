import { describe, expect, it } from 'vitest';
import { parseEmbedOptions } from './EmbedLayout';

describe('parseEmbedOptions', () => {
  it('parses supported query params', () => {
    const options = parseEmbedOptions('?theme=dark&currency=usd&lang=pl&poweredBy=0');

    expect(options).toEqual({
      theme: 'dark',
      currencyCode: 'USD',
      lang: 'pl',
      poweredBy: false
    });
  });

  it('returns defaults for missing/invalid params', () => {
    const options = parseEmbedOptions('?theme=unknown&currency=abcd');

    expect(options.theme).toBe('light');
    expect(options.currencyCode).toBe('EUR');
    expect(options.lang).toBe('en');
    expect(options.poweredBy).toBe(true);
  });
});

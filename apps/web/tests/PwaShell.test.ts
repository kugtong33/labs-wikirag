import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('PWA shell metadata', () => {
  it('links a web app manifest from index.html', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

    expect(html).toContain('rel="manifest"');
    expect(html).toContain('/manifest.webmanifest');
  });
});

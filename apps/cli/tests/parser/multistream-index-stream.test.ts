import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';

const { createBz2ReadStreamMock } = vi.hoisted(() => ({
  createBz2ReadStreamMock: vi.fn(),
}));

vi.mock('../../src/parser/bz2-stream.js', () => ({
  createBz2ReadStream: createBz2ReadStreamMock,
}));

import { parseMultistreamIndex } from '../../src/parser/multistream-index.js';

function createLegacyReadable(chunks: string[]): NodeJS.ReadableStream {
  const emitter = new EventEmitter();

  queueMicrotask(() => {
    for (const chunk of chunks) {
      emitter.emit('data', Buffer.from(chunk, 'utf8'));
    }
    emitter.emit('end');
  });

  return emitter as unknown as NodeJS.ReadableStream;
}

describe('multistream-index legacy stream compatibility', () => {
  it('parses bz2 index lines from non-async-iterable streams', async () => {
    createBz2ReadStreamMock.mockImplementationOnce(() => createLegacyReadable([
      '4125:3:Zulu\n',
      '0:1:Alpha\n',
      '0:2:Beta\n',
    ]));

    const entries = await parseMultistreamIndex('/tmp/index.txt.bz2');

    expect(entries).toHaveLength(3);
    expect(entries.map((entry) => entry.byteOffset)).toEqual([0, 0, 4125]);
    expect(entries[0]).toMatchObject({
      byteOffset: 0,
      articleId: '1',
      articleTitle: 'Alpha',
    });
  });
});

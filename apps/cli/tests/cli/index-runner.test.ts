import { describe, it, expect } from 'vitest';
import { nextResumeDecision } from '../../src/cli/commands/index-runner.js';

describe('index-runner resume decisions', () => {
  it('skips all entries until anchor article is found', () => {
    const initialState = {
      anchorFound: false,
      skippingAnchorTail: false,
    };

    const decision = nextResumeDecision('41', '42', initialState);

    expect(decision.skip).toBe(true);
    expect(decision.state).toEqual(initialState);
  });

  it('keeps skipping anchor article tail to avoid duplicate processing', () => {
    const foundAnchor = nextResumeDecision('42', '42', {
      anchorFound: false,
      skippingAnchorTail: false,
    });

    expect(foundAnchor.skip).toBe(true);
    expect(foundAnchor.state).toEqual({
      anchorFound: true,
      skippingAnchorTail: true,
    });

    const stillAnchor = nextResumeDecision('42', '42', foundAnchor.state);
    expect(stillAnchor.skip).toBe(true);
  });

  it('starts yielding only after moving beyond the anchor article', () => {
    const afterAnchor = nextResumeDecision('43', '42', {
      anchorFound: true,
      skippingAnchorTail: true,
    });

    expect(afterAnchor.skip).toBe(false);
    expect(afterAnchor.state).toEqual({
      anchorFound: true,
      skippingAnchorTail: false,
    });
  });
});

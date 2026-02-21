/**
 * Tests for StreamingResponse component
 *
 * @module web/tests/StreamingResponse
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StreamingResponse } from '../src/components/StreamingResponse.js';

describe('StreamingResponse', () => {
  it('renders nothing visible in idle state', () => {
    const { container } = render(
      <StreamingResponse
        status="idle"
        responseText=""
        error={null}
        requestId={null}
        completedAt={null}
      />
    );
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  it('shows a loading indicator in loading state', () => {
    render(
      <StreamingResponse
        status="loading"
        responseText=""
        error={null}
        requestId={null}
        completedAt={null}
      />
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays response text during streaming', () => {
    render(
      <StreamingResponse
        status="streaming"
        responseText="Paris is the capital"
        error={null}
        requestId={null}
        completedAt={null}
      />
    );
    expect(screen.getByText(/paris is the capital/i)).toBeInTheDocument();
  });

  it('displays full response text on complete', () => {
    render(
      <StreamingResponse
        status="complete"
        responseText="Paris is the capital of France."
        error={null}
        requestId="req-abc-123"
        completedAt="2026-02-21T12:00:00.000Z"
      />
    );
    expect(screen.getByText(/paris is the capital of france/i)).toBeInTheDocument();
  });

  it('displays requestId on completion', () => {
    render(
      <StreamingResponse
        status="complete"
        responseText="Answer"
        error={null}
        requestId="req-abc-123"
        completedAt="2026-02-21T12:00:00.000Z"
      />
    );
    expect(screen.getByText(/req-abc-123/i)).toBeInTheDocument();
  });

  it('displays timestamp on completion', () => {
    render(
      <StreamingResponse
        status="complete"
        responseText="Answer"
        error={null}
        requestId="req-abc-123"
        completedAt="2026-02-21T12:00:00.000Z"
      />
    );
    // Timestamp is formatted and shown
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('shows user-friendly error message in error state', () => {
    render(
      <StreamingResponse
        status="error"
        responseText=""
        error="Unable to reach the server. Please check your connection."
        requestId={null}
        completedAt={null}
      />
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/unable to reach/i)).toBeInTheDocument();
  });

  it('does not show requestId or timestamp outside complete state', () => {
    render(
      <StreamingResponse
        status="streaming"
        responseText="Partial"
        error={null}
        requestId="req-123"
        completedAt="2026-02-21T12:00:00.000Z"
      />
    );
    expect(screen.queryByText(/req-123/)).not.toBeInTheDocument();
  });
});

/**
 * App root component
 *
 * Sets up React Router and loads technique list from the API on mount.
 * Routes / to SingleQuery (default view).
 *
 * @module web/App
 */

import { useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useQueryStore } from './stores/query-store.js';
import { SingleQuery } from './pages/SingleQuery.js';
import { ComparisonMode } from './pages/ComparisonMode.js';

const LOAD_BUDGET_MS = 3_000;

interface Technique {
  name: string;
  description: string;
}

interface TechniquesResponse {
  data: Technique[];
}

const API_BASE = import.meta.env['VITE_API_BASE_URL'] ?? 'http://localhost:3000';

const isTechnique = (value: unknown): value is Technique => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record['name'] === 'string' && typeof record['description'] === 'string';
};

const isTechniquesResponse = (value: unknown): value is TechniquesResponse => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return Array.isArray(record['data']) && record['data'].every(isTechnique);
};

const getDomContentLoadedMs = (): number | null => {
  if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') {
    return null;
  }

  const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  const domContentLoadedMs = entries[0]?.domContentLoadedEventEnd;

  return typeof domContentLoadedMs === 'number' ? domContentLoadedMs : null;
};

/**
 * Root application component. Fetches available techniques on mount and
 * passes them to the query views via props (no global store for techniques).
 */
export function App() {
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const mode = useQueryStore((state) => state.mode);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    fetch(`${API_BASE}/api/techniques`)
      .then((r) => r.json())
      .then((body: unknown) => {
        if (!active) {
          return;
        }

        if (isTechniquesResponse(body)) {
          setTechniques(body.data);
          return;
        }

        setTechniques([]);
      })
      .catch(() => {
        // API unavailable — show empty list; user can still see the UI
        if (active) {
          setTechniques([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const expectedPath = mode === 'comparison' ? '/comparison' : '/';

    if (location.pathname !== expectedPath) {
      navigate(expectedPath, { replace: true });
    }
  }, [location.pathname, mode, navigate]);

  useEffect(() => {
    const domContentLoadedMs = getDomContentLoadedMs();

    if (domContentLoadedMs !== null && domContentLoadedMs > LOAD_BUDGET_MS) {
      console.warn(`Initial load exceeded 3s budget: ${Math.round(domContentLoadedMs)}ms`);
    }
  }, []);

  return (
    <Routes>
      <Route path="/" element={<SingleQuery techniques={techniques} />} />
      <Route path="/comparison" element={<ComparisonMode techniques={techniques} />} />
    </Routes>
  );
}

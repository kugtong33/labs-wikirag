/**
 * App root component
 *
 * Sets up React Router and loads technique list from the API on mount.
 * Routes / to SingleQuery (default view).
 *
 * @module web/App
 */

import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { SingleQuery } from './pages/SingleQuery.js';

interface Technique {
  name: string;
  description: string;
}

const API_BASE = import.meta.env['VITE_API_BASE_URL'] ?? 'http://localhost:3000';

/**
 * Root application component. Fetches available techniques on mount and
 * passes them to the query views via props (no global store for techniques).
 */
export function App() {
  const [techniques, setTechniques] = useState<Technique[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/techniques`)
      .then((r) => r.json())
      .then((body: { data: Technique[] }) => setTechniques(body.data))
      .catch(() => {
        // API unavailable — show empty list; user can still see the UI
        setTechniques([]);
      });
  }, []);

  return (
    <Routes>
      <Route path="/" element={<SingleQuery techniques={techniques} />} />
      <Route path="/comparison" element={<SingleQuery techniques={techniques} />} />
    </Routes>
  );
}

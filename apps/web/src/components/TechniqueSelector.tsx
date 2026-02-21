/**
 * TechniqueSelector component
 *
 * Accessible dropdown for selecting a RAG technique.
 * Uses a native <select> element for maximum keyboard and screen-reader support.
 *
 * @module web/components/TechniqueSelector
 */

interface Technique {
  name: string;
  description: string;
}

interface TechniqueSelectorProps {
  techniques: Technique[];
  value: string;
  onChange: (techniqueName: string) => void;
}

/**
 * Labelled select dropdown for RAG technique selection.
 *
 * The label is linked to the select via htmlFor/id, enabling click-to-focus
 * and screen reader association. Keyboard navigation is native to <select>.
 */
export function TechniqueSelector({
  techniques,
  value,
  onChange,
}: TechniqueSelectorProps) {
  const selectId = 'technique-selector';

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-sm font-medium text-gray-700">
        Technique
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {techniques.map((t) => (
          <option key={t.name} value={t.name}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}

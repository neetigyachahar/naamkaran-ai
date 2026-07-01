interface NameChipProps {
  name: string;
  score?: number;
  active: boolean;
  onSelect: () => void;
}

export function NameChip({ name, score, active, onSelect }: NameChipProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition sm:text-sm ${
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "bg-white text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50"
      }`}
    >
      <span>{name}</span>
      {score != null && (
        <span
          className={`rounded px-1 py-0.5 text-[10px] font-semibold ${
            active ? "bg-indigo-500 text-white" : "bg-indigo-100 text-indigo-700"
          }`}
        >
          {score}
        </span>
      )}
    </button>
  );
}

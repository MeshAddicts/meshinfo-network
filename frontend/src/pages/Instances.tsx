import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import type { Instance } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

function formatLastSeen(isoString: string | null): string {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function LocationBadge({ instance }: { instance: Instance }) {
  const parts = [instance.metro, instance.region, instance.country].filter(
    Boolean
  );
  if (parts.length === 0) return null;
  return (
    <span className="text-xs text-gray-500 dark:text-gray-400">
      📍 {parts.join(', ')}
    </span>
  );
}

export const Instances = () => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/instances`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Instance[]>;
      })
      .then(setInstances)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e))
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = instances.filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.display_name.toLowerCase().includes(q) ||
      i.canonical_url.toLowerCase().includes(q) ||
      (i.description ?? '').toLowerCase().includes(q) ||
      (i.region ?? '').toLowerCase().includes(q) ||
      (i.country ?? '').toLowerCase().includes(q) ||
      (i.metro ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            MeshInfo Instances
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Approved, publicly listed MeshInfo instances
          </p>
        </div>
        <input
          type="search"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64 px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-500 dark:text-gray-400">
          <div className="h-6 w-6 rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-indigo-500 animate-spin mr-3" />
          Loading…
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-20 text-red-500 dark:text-red-400">
          Failed to load instances: {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          {search ? 'No instances match your search.' : 'No instances yet.'}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((instance) => (
            <Link
              key={instance.id}
              to={`/instances/${instance.id}`}
              className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors group"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {instance.display_name}
                    </span>
                    {instance.reporting_mode !== 'none' && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                        {instance.reporting_mode}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-indigo-600 dark:text-indigo-400 font-mono mb-1">
                    {instance.canonical_url}
                  </div>
                  {instance.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {instance.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2">
                    <LocationBadge instance={instance} />
                    {instance.software_version && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        v{instance.software_version}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                  {formatLastSeen(instance.last_seen_at)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

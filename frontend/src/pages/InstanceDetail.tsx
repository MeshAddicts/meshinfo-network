import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';

import type { InstanceDetail } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

function formatDate(isoString: string | null): string {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString();
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <dt className="w-40 text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0 pt-0.5">
        {label}
      </dt>
      <dd className="text-sm text-gray-900 dark:text-gray-100 flex-1 break-all">
        {value ?? '—'}
      </dd>
    </div>
  );
}

export const InstanceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [instance, setInstance] = useState<InstanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/instances/${id}`)
      .then((r) => {
        if (r.status === 404) throw new Error('Instance not found');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<InstanceDetail>;
      })
      .then(setInstance)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e))
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 dark:text-gray-400">
        <div className="h-6 w-6 rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-indigo-500 animate-spin mr-3" />
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <Link
          to="/instances"
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-6 inline-block"
        >
          ← Back to Instances
        </Link>
        <div className="text-center py-10 text-red-500 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (!instance) return null;

  const location = [instance.metro, instance.region, instance.country]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Link
        to="/instances"
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-6 inline-block"
      >
        ← Back to Instances
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          {instance.display_name}
        </h1>
        <a
          href={`https://${instance.canonical_url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-mono text-indigo-600 dark:text-indigo-400"
        >
          {instance.canonical_url} ↗
        </a>
      </div>

      {instance.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          {instance.description}
        </p>
      )}

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Details
        </h2>
        <dl>
          <Row label="URL" value={instance.canonical_url} />
          <Row label="Location" value={location || null} />
          <Row label="Last Seen" value={formatDate(instance.last_seen_at)} />
          <Row
            label="Version"
            value={
              instance.software_version
                ? `v${instance.software_version}`
                : null
            }
          />
          <Row label="Reporting Mode" value={instance.reporting_mode} />
          <Row label="Listed Since" value={formatDate(instance.created_at)} />
          {instance.contact_url && (
            <Row
              label="Contact"
              value={
                <a
                  href={instance.contact_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {instance.contact_url}
                </a>
              }
            />
          )}
        </dl>
      </div>

      {(instance.latest_node_count != null ||
        instance.latest_map_bounds_coarse) && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Latest Stats
          </h2>
          <dl>
            {instance.latest_node_count != null && (
              <Row
                label="Node Count"
                value={instance.latest_node_count.toLocaleString()}
              />
            )}
            {instance.latest_map_bounds_coarse && (
              <Row
                label="Map Bounds"
                value={instance.latest_map_bounds_coarse}
              />
            )}
            {instance.latest_stats_at && (
              <Row
                label="Stats Received"
                value={formatDate(instance.latest_stats_at)}
              />
            )}
          </dl>
        </div>
      )}
    </div>
  );
};

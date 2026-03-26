import { Link } from 'react-router';

export const Home = () => {
  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          MeshInfo Network
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
          A central directory for{' '}
          <a
            href="https://github.com/MeshAddicts/meshinfo"
            target="_blank"
            rel="noopener noreferrer"
          >
            MeshInfo
          </a>{' '}
          instances — websites that track and display Meshtastic mesh network
          activity.
        </p>
      </div>

      {/* CTA */}
      <div className="mb-12">
        <Link
          to="/instances"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Browse Instances →
        </Link>
      </div>

      {/* What is MeshInfo */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          What is MeshInfo?
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-3">
          <a
            href="https://github.com/MeshAddicts/meshinfo"
            target="_blank"
            rel="noopener noreferrer"
          >
            MeshInfo
          </a>{' '}
          is open-source software that connects to a Meshtastic mesh network and
          provides a web interface for browsing nodes, activity, maps, and chat.
          Anyone running a Meshtastic network can run their own MeshInfo
          instance.
        </p>
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
          MeshInfo Network is where those instances are listed and discovered.
          Think of it as a directory of Meshtastic communities.
        </p>
      </section>

      {/* How it works */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          How Instance Registration Works
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          <li>
            A MeshInfo instance sends a registration request with its URL, name,
            and optional location info.
          </li>
          <li>
            MeshInfo Network generates a secret token and returns it once. The
            instance stores this token locally.
          </li>
          <li>
            The registration starts in a <em>pending</em> state and is invisible
            publicly until a maintainer approves it.
          </li>
          <li>
            Once approved, the instance appears in the public directory.
          </li>
          <li>
            The instance uses its token to send periodic heartbeat or stats
            updates.
          </li>
        </ol>
      </section>

      {/* Privacy / reporting modes */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Privacy & Reporting Modes
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4">
          MeshInfo instances can choose how much (if anything) they report to
          MeshInfo Network. The default is <strong>none</strong>.
        </p>
        <div className="space-y-3">
          {[
            {
              mode: 'none',
              desc: 'No outbound calls at all. No registration, no heartbeat, no stats. Complete silence.',
            },
            {
              mode: 'heartbeat',
              desc: 'Registers on startup and sends lightweight "I am here" updates. No detailed data.',
            },
            {
              mode: 'stats',
              desc: 'Includes heartbeat behavior plus a coarse, privacy-conscious stats payload (e.g. node count, rough geographic bounds).',
            },
          ].map(({ mode, desc }) => (
            <div
              key={mode}
              className="flex gap-3 p-3 rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
            >
              <code className="text-xs font-mono text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                {mode}
              </code>
              <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Ready to explore?
        </p>
        <Link
          to="/instances"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          View All Instances →
        </Link>
      </div>
    </div>
  );
};

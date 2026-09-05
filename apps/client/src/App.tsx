import { useEffect, useState } from "react";

type VersionResponse = {
  version: string;
  secret: string;
  environmentVariables: Record<string, string>;
};

function App() {
  const [data, setData] = useState<VersionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Direct call to the API — different origin from the frontend, which is
    // why the Express side needs the cors() middleware. (With an nginx reverse
    // proxy we could use a relative /api path and skip CORS entirely.)
    fetch("http://localhost:4000/api/version")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  if (error) {
    return (
      <main style={styles.wrap}>
        <h1>❌ Could not reach the API</h1>
        <p style={styles.muted}>{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main style={styles.wrap}>
        <h1>Loading…</h1>
      </main>
    );
  }

  const envEntries = Object.entries(data.environmentVariables);

  return (
    <main style={styles.wrap}>
      <h1>This is {data.version}</h1>
      <p>
        The secret is: <code style={styles.secret}>{data.secret}</code>
      </p>
      <h2 style={styles.h2}>These are the environment variables</h2>
      <div style={styles.grid}>
        {envEntries.map(([key, value]) => (
          <div key={key} style={styles.row}>
            <code style={styles.key}>{key}</code>
            <code style={styles.value}>{value}</code>
          </div>
        ))}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    fontFamily: "system-ui, sans-serif",
    maxWidth: 720,
    margin: "0 auto",
    padding: "2rem",
  },
  h2: { marginTop: "2rem", fontWeight: 500 },
  muted: { color: "#888" },
  secret: { color: "#a3572a" },
  grid: { display: "grid", gap: 8, fontSize: 14 },
  row: { display: "flex", gap: 12 },
  key: { color: "#0a7d33", minWidth: 120, flexShrink: 0 },
  value: { color: "#555", wordBreak: "break-all" },
};

export default App;
const implementedFoundations = [
  "Strict domain schemas",
  "Deterministic entity resolution",
  "Attribute claim and conflict functions",
  "Direction-preserving relationship keys",
];

export function App() {
  return (
    <main className="app-shell">
      <section className="status-card" aria-labelledby="project-title">
        <p className="eyebrow">CreativeOS foundation</p>
        <h1 id="project-title">Creative Knowledge Engine</h1>
        <p className="summary">
          Turn scattered creative knowledge into a structured, searchable,
          creator-controlled knowledge base.
        </p>

        <div className="status-badge">Step 0–1 foundation ready</div>

        <ul>
          {implementedFoundations.map((foundation) => (
            <li key={foundation}>{foundation}</li>
          ))}
        </ul>

        <p className="boundary-note">
          AI proposes create candidates. Creators decide what becomes
          Knowledge.
        </p>
      </section>
    </main>
  );
}

import type { AppView } from "../state/types";

export function AppHeader(props: {
  currentView: AppView;
  isBusy: boolean;
  onNavigate(view: AppView): void;
}) {
  return (
    <header className="app-header">
      <button
        className="brand-button"
        type="button"
        onClick={() => props.onNavigate("home")}
      >
        <span className="brand-mark" aria-hidden="true">CK</span>
        <span>
          <strong>Creative Knowledge Engine</strong>
          <small>Creator-controlled review workspace</small>
        </span>
      </button>
      <nav aria-label="メインナビゲーション" className="main-nav">
        {([
          ["home", "Home"],
          ["import", "Import"],
          ["knowledge", "Knowledge"],
          ["search", "Search"],
          ["graph", "Graph"],
        ] as const).map(([view, label]) => (
          <button
            key={view}
            type="button"
            className={props.currentView === view ? "nav-active" : ""}
            aria-current={props.currentView === view ? "page" : undefined}
            disabled={props.isBusy}
            onClick={() => props.onNavigate(view)}
          >
            {label}
          </button>
        ))}
      </nav>
    </header>
  );
}

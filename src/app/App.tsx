import { AppHeader } from "./components/AppHeader";
import { ErrorView } from "./components/ErrorView";
import { FeedbackBanner } from "./components/FeedbackBanner";
import { LoadingView } from "./components/LoadingView";
import type { ApplicationDependencies } from "./state/types";
import { useApplicationController } from "./state/useApplicationController";
import { HomeView } from "./views/HomeView";
import { ImportView } from "./views/ImportView";
import { KnowledgeView } from "./views/KnowledgeView";
import { ReviewView } from "./views/ReviewView";
import { SearchView } from "./views/SearchView";
import { GraphView } from "./views/GraphView";

export function App(props: { dependencies: ApplicationDependencies }) {
  const controller = useApplicationController(props.dependencies);
  const { state, actions } = controller;

  if (state.status === "loading") return <LoadingView />;
  if (state.status === "error") {
    return (
      <ErrorView
        error={
          state.error ?? {
            code: "UNKNOWN_ERROR",
            title: "Workspaceを読み込めません",
            detail: "保存済みデータは変更していません。",
          }
        }
        isBusy={state.isBusy}
        onRetry={() => void actions.initialize()}
      />
    );
  }

  if (state.snapshot === null) return <LoadingView />;

  return (
    <div className="application-frame">
      <AppHeader
        currentView={state.view}
        isBusy={state.isBusy}
        onNavigate={actions.navigate}
      />
      <FeedbackBanner
        message={state.message}
        error={state.error}
        onDismiss={actions.clearFeedback}
      />
      {state.view === "home" && (
        <HomeView
          snapshot={state.snapshot}
          projectAstra={props.dependencies.projectAstra}
          isBusy={state.isBusy}
          resetIntent={state.resetIntent}
          actions={actions}
        />
      )}
      {state.view === "import" && (
        <ImportView
          snapshot={state.snapshot}
          projectAstra={props.dependencies.projectAstra}
          isBusy={state.isBusy}
          actions={actions}
        />
      )}
      {state.view === "review" && (
        <ReviewView
          snapshot={state.snapshot}
          activeReviewSessionId={state.activeReviewSessionId}
          isBusy={state.isBusy}
          actions={actions}
        />
      )}
      {state.view === "knowledge" && (
        <KnowledgeView
          snapshot={state.snapshot}
          selectedEntityId={state.selectedEntityId}
          isBusy={state.isBusy}
          actions={actions}
        />
      )}
      {state.view === "search" && (
        <SearchView
          knowledge={state.snapshot.knowledge}
          query={state.searchQuery}
          filters={state.searchFilters}
          selectedEntityId={state.selectedEntityId}
          actions={actions}
        />
      )}
      {state.view === "graph" && (
        <GraphView
          knowledge={state.snapshot.knowledge}
          filters={state.graphFilters}
          selectedEntityId={state.selectedEntityId}
          selectedRelationshipId={state.selectedRelationshipId}
          actions={actions}
        />
      )}
      {state.isBusy && (
        <div className="busy-overlay" role="status" aria-live="polite">
          処理しています…
        </div>
      )}
    </div>
  );
}

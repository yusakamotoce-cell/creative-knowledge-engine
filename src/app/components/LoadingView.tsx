export function LoadingView() {
  return (
    <main className="centered-state" aria-busy="true">
      <div className="loading-indicator" aria-hidden="true" />
      <h1>Workspaceを読み込んでいます</h1>
      <p>保存済みKnowledgeとReview Sessionを確認しています。</p>
    </main>
  );
}

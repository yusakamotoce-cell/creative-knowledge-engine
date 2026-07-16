import type { UiError } from "../state/types";

export function ErrorView(props: {
  error: UiError;
  isBusy: boolean;
  onRetry(): void;
}) {
  return (
    <main className="centered-state" role="alert" aria-live="assertive">
      <p className="eyebrow">Storage error</p>
      <h1>{props.error.title}</h1>
      <p>{props.error.detail}</p>
      <code>{props.error.code}</code>
      <p className="boundary-note">保存データは自動削除していません。</p>
      <button
        className="primary-button"
        type="button"
        disabled={props.isBusy}
        onClick={props.onRetry}
      >
        再試行
      </button>
    </main>
  );
}

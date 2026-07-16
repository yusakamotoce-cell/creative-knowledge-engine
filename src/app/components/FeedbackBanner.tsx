import type { UiError, UiMessage } from "../state/types";

export function FeedbackBanner(props: {
  message: UiMessage | null;
  error: UiError | null;
  onDismiss(): void;
}) {
  if (props.error !== null) {
    return (
      <section className="feedback feedback-error" role="alert" aria-live="assertive">
        <div>
          <strong>{props.error.title}</strong>
          <p>{props.error.detail}</p>
          <code>{props.error.code}</code>
        </div>
        <button type="button" onClick={props.onDismiss} aria-label="エラーを閉じる">
          閉じる
        </button>
      </section>
    );
  }

  if (props.message === null) return <div aria-live="polite" />;

  return (
    <section
      className={`feedback feedback-${props.message.kind}`}
      aria-live="polite"
    >
      <strong>{props.message.kind === "success" ? "完了" : "お知らせ"}</strong>
      <p>{props.message.text}</p>
      <button type="button" onClick={props.onDismiss} aria-label="メッセージを閉じる">
        閉じる
      </button>
    </section>
  );
}

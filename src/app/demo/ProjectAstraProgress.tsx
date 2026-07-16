import type { ProjectAstraDocumentProgress } from "../state/projectAstraProgress";

const statusLabels: Record<ProjectAstraDocumentProgress["status"], string> = {
  not_imported: "未Import",
  entity_review: "Entity Review",
  relationship_review: "Relationship Review",
  complete_not_applied: "反映待ち",
  applied: "反映済み",
};

export function ProjectAstraProgress(props: {
  progress: ProjectAstraDocumentProgress[];
}) {
  const applied = props.progress.filter((item) => item.status === "applied").length;

  return (
    <section className="panel demo-progress" aria-labelledby="astra-progress-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Network-free Demo</p>
          <h2 id="astra-progress-title">Project Astra</h2>
        </div>
        <strong>{applied} / 4 applied</strong>
      </div>
      <ol>
        {props.progress.map((item) => (
          <li key={item.documentId}>
            <span className="document-order">{String(item.order).padStart(2, "0")}</span>
            <span>
              <strong>{item.fileName}</strong>
              <small>{item.documentId}</small>
            </span>
            <span className={`status-chip status-${item.status}`}>
              {statusLabels[item.status]}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

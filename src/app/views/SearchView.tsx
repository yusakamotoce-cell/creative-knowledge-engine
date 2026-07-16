import { useMemo, useState, type KeyboardEvent } from "react";

import { graphEntityTypeLanes } from "../../core/graph";
import { normalizeSearchText, searchEntities } from "../../core/search";
import type { KnowledgeState } from "../../core/knowledge";
import { EntityDetail } from "../knowledge/EntityDetail";
import type { ApplicationControllerActions } from "../state/useApplicationController";
import type { EntitySearchFilters } from "../../core/search";

export function SearchView(props: {
  knowledge: KnowledgeState;
  query: string;
  filters: EntitySearchFilters;
  selectedEntityId: string | null;
  actions: ApplicationControllerActions;
}) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const response = useMemo(
    () => searchEntities(props.knowledge, props.query, props.filters),
    [props.filters, props.knowledge, props.query],
  );
  const selectedTypes = props.filters.entityTypes ?? [...graphEntityTypeLanes];
  const selectedTags = props.filters.tags ?? [];
  const selectedEntity = props.knowledge.entities.find(
    (entity) => entity.id === props.selectedEntityId,
  );

  const setFilters = (filters: EntitySearchFilters) =>
    props.actions.setSearchFilters(filters);

  const handleQuery = (value: string) => {
    if (value.length > 200) {
      setValidationError("検索語は200文字以内で入力してください。");
      return;
    }
    setValidationError(null);
    props.actions.setSearchQuery(value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handleQuery("");
    }
    if (event.key === "Enter" && response.results[0] !== undefined) {
      event.preventDefault();
      props.actions.selectEntity(response.results[0].entity.id);
    }
  };

  return (
    <main className="page-shell">
      <section className="page-intro">
        <p className="eyebrow">Deterministic registered Knowledge search</p>
        <h1>Entity Search</h1>
        <p>検索対象はEntityのname、aliases、tagsだけです。description、attributes、SourceRef本文は検索しません。</p>
      </section>

      <section className="panel search-controls" aria-labelledby="search-controls-title">
        <h2 id="search-controls-title">検索条件</h2>
        <div className="search-query-row">
          <label>
            検索語
            <input
              type="search"
              value={props.query}
              maxLength={200}
              aria-describedby={validationError === null ? "search-normalization-note" : "search-query-error"}
              onChange={(event) => handleQuery(event.target.value)}
              onKeyDown={handleKeyDown}
            />
          </label>
          <button type="button" onClick={() => handleQuery("")} disabled={props.query.length === 0}>
            検索語をクリア
          </button>
        </div>
        {validationError === null ? (
          <p id="search-normalization-note" className="supporting-note">
            NFKC、空白縮約、小文字化をSearch専用に適用します。
          </p>
        ) : (
          <p id="search-query-error" className="form-error">{validationError}</p>
        )}

        <div className="filter-grid">
          <fieldset>
            <legend>EntityType</legend>
            {graphEntityTypeLanes.map((entityType) => (
              <label key={entityType} className="check-label">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(entityType)}
                  onChange={() =>
                    setFilters({
                      ...props.filters,
                      entityTypes: graphEntityTypeLanes.filter((candidate) =>
                        candidate === entityType
                          ? !selectedTypes.includes(candidate)
                          : selectedTypes.includes(candidate),
                      ),
                    })
                  }
                />
                {entityType}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Tags（複数選択はAND）</legend>
            {response.availableTags.length === 0 ? <p>利用可能なtagはありません。</p> : response.availableTags.map((tag) => {
              const normalized = normalizeSearchText(tag);
              const checked = selectedTags.some(
                (selected) => normalizeSearchText(selected) === normalized,
              );
              return (
                <label key={normalized} className="check-label">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setFilters({
                        ...props.filters,
                        tags: checked
                          ? selectedTags.filter(
                              (selected) => normalizeSearchText(selected) !== normalized,
                            )
                          : [...selectedTags, tag],
                      })
                    }
                  />
                  {tag}
                </label>
              );
            })}
          </fieldset>
        </div>
      </section>

      <section className="search-layout" aria-labelledby="search-results-title">
        <div className="panel">
          <div className="section-heading">
            <h2 id="search-results-title">検索結果</h2>
            <strong aria-live="polite">{response.results.length}件</strong>
          </div>
          {response.results.length === 0 ? (
            <div className="empty-state"><h3>一致するEntityはありません</h3></div>
          ) : (
            <nav className="search-results" aria-label="Entity検索結果">
              {response.results.map((result) => (
                <button
                  type="button"
                  key={result.entity.id}
                  aria-pressed={props.selectedEntityId === result.entity.id}
                  className={props.selectedEntityId === result.entity.id ? "entity-selected" : ""}
                  onClick={() => props.actions.selectEntity(result.entity.id)}
                >
                  <span>
                    <strong>{result.entity.name}</strong>
                    <small>{result.entity.entityType} · score {result.score}</small>
                  </span>
                  <span className="match-list">
                    {result.matches.map((match) => (
                      <small key={`${match.field}-${match.normalizedValue}`}>
                        {match.field}: {match.kind} · {match.value}
                      </small>
                    ))}
                  </span>
                </button>
              ))}
            </nav>
          )}
        </div>
        <div className="panel">
          {selectedEntity === undefined ? (
            <div className="empty-state"><h2>検索結果からEntityを選択してください</h2></div>
          ) : (
            <EntityDetail entity={selectedEntity} knowledge={props.knowledge} />
          )}
        </div>
      </section>
    </main>
  );
}


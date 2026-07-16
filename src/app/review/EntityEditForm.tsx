import { useState, type FormEvent } from "react";

import type { EntityCandidate } from "../../core/candidates/candidate";
import type { EntityCandidateEdit } from "../../core/review/entityReview";
import type { EntityType } from "../../core/entities/entity";
import type { ScalarValue } from "../../core/shared/schemas";

interface AttributeRow {
  key: string;
  type: "string" | "number" | "boolean";
  value: string;
}

function rowFromAttribute(key: string, value: ScalarValue): AttributeRow {
  const type: AttributeRow["type"] =
    typeof value === "number"
      ? "number"
      : typeof value === "boolean"
        ? "boolean"
        : "string";
  return { key, type, value: String(value) };
}

function valueFromRow(row: AttributeRow): ScalarValue {
  if (row.type === "number") return Number(row.value);
  if (row.type === "boolean") return row.value === "true";
  return row.value;
}

export function EntityEditForm(props: {
  candidate: EntityCandidate;
  disabled: boolean;
  onSave(edit: EntityCandidateEdit): void;
}) {
  const [entityType, setEntityType] = useState<EntityType>(props.candidate.entityType);
  const [name, setName] = useState(props.candidate.name);
  const [aliases, setAliases] = useState(props.candidate.aliases.join(", "));
  const [description, setDescription] = useState(props.candidate.description);
  const [tags, setTags] = useState(props.candidate.tags.join(", "));
  const [attributes, setAttributes] = useState<AttributeRow[]>(
    Object.entries(props.candidate.attributes).map(([key, value]) =>
      rowFromAttribute(key, value),
    ),
  );

  const updateAttribute = (index: number, update: Partial<AttributeRow>) => {
    setAttributes((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...update } : row,
      ),
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsedAttributes = Object.fromEntries(
      attributes
        .filter((row) => row.key.trim().length > 0)
        .map((row) => [row.key, valueFromRow(row)]),
    );
    props.onSave({
      entityType,
      name,
      aliases: aliases.split(",").map((value) => value.trim()).filter(Boolean),
      description,
      attributes: parsedAttributes,
      tags: tags.split(",").map((value) => value.trim()).filter(Boolean),
    });
  };

  return (
    <form className="subpanel form-stack" onSubmit={submit}>
      <h4>CandidateをEdit</h4>
      <div className="form-row">
        <label>
          entityType
          <select
            value={entityType}
            disabled={props.disabled}
            onChange={(event) => setEntityType(event.target.value as EntityType)}
          >
            <option value="character">character</option>
            <option value="scene">scene</option>
            <option value="location">location</option>
            <option value="item">item</option>
            <option value="organization">organization</option>
          </select>
        </label>
        <label>
          name
          <input value={name} disabled={props.disabled} onChange={(event) => setName(event.target.value)} />
        </label>
      </div>
      <label>
        aliases（カンマ区切り）
        <input value={aliases} disabled={props.disabled} onChange={(event) => setAliases(event.target.value)} />
      </label>
      <label>
        description
        <textarea rows={3} value={description} disabled={props.disabled} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label>
        tags（カンマ区切り）
        <input value={tags} disabled={props.disabled} onChange={(event) => setTags(event.target.value)} />
      </label>
      <fieldset disabled={props.disabled}>
        <legend>attributes</legend>
        {attributes.map((row, index) => (
          <div className="attribute-row" key={`${index}-${row.key}`}>
            <label>
              key
              <input value={row.key} onChange={(event) => updateAttribute(index, { key: event.target.value })} />
            </label>
            <label>
              type
              <select value={row.type} onChange={(event) => updateAttribute(index, { type: event.target.value as AttributeRow["type"] })}>
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
              </select>
            </label>
            <label>
              value
              {row.type === "boolean" ? (
                <select value={row.value} onChange={(event) => updateAttribute(index, { value: event.target.value })}>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input type={row.type === "number" ? "number" : "text"} value={row.value} onChange={(event) => updateAttribute(index, { value: event.target.value })} />
              )}
            </label>
            <button type="button" onClick={() => setAttributes((current) => current.filter((_, rowIndex) => rowIndex !== index))}>
              削除
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setAttributes((current) => [...current, { key: "", type: "string", value: "" }])}>
          属性を追加
        </button>
      </fieldset>
      <button type="submit" disabled={props.disabled}>Editを保存</button>
      <p className="supporting-note">candidateIdとSourceRefは編集できません。</p>
    </form>
  );
}

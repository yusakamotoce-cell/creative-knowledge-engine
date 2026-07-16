# Context Bundle テストマトリクス

**Status:** 実装前テスト設計  
**前提:** P0契約確定後に期待値を固定する  
**現状:** テストランナーと実装コードは未存在。テスト実行は未実施。

## 1. 方針

- JSONを正規形式とし、MarkdownはJSONからの表示形式としてテストする。
- 既存Project Astraは公式回帰Fixture、型差・resolved Conflict・境界値はsynthetic fixtureに分ける。
- Clock、Bundle ID、必要ならHasherを固定して非決定要因を除く。
- 入力配列順、object key挿入順、locale、実行回数に依存しないことを確認する。
- Context Bundleテストだけでなく、Candidate BundleとKnowledge Base Exportの非変更を回帰テストする。

優先度は次の意味で使用する。

- **P0:** 実装を受け入れるために必須
- **P1:** Build Week stretch実装に含める
- **P2:** Markdown/UI連携時またはBuild Week後

## 2. Request Schema

| ID / テスト名 | 入力・Fixture | 期待結果 | 優先度 |
|---|---|---|---|
| `request_accepts_valid_context_bundle_request` | Root 1件、既知preset、depth 1、both、reference、正の上限 | strict Schemaを通過 | P0 |
| `request_rejects_empty_root_entity_ids` | `rootEntityIds: []` | 検証エラー | P0 |
| `request_deduplicates_root_ids_preserving_first_occurrence` | `[B, A, B]` | `[B, A]`となり順序を保持 | P0 |
| `request_rejects_unknown_root_entity_id` | KnowledgeにないID | traversal前に検証エラー | P0 |
| `request_rejects_unknown_purpose_preset` | 未知preset | 検証エラー | P0 |
| `request_rejects_depth_above_two` | depth 3 | 検証エラー | P0 |
| `request_rejects_negative_depth` | depth -1 | 検証エラー | P0 |
| `request_rejects_unknown_traversal_direction` | 未知direction | 検証エラー | P0 |
| `request_rejects_unknown_source_mode` | 未知sourceMode | 検証エラー | P0 |
| `request_rejects_non_positive_max_characters` | 0、負数 | 検証エラー | P0 |
| `request_rejects_fractional_max_characters` | 100.5 | 検証エラー | P0 |
| `request_validates_excerpt_limit_contract` | excerpt modeで0、負数、端数 | P0決定どおり拒否 | P0 |
| `request_ignores_or_omits_excerpt_limit_outside_excerpt_mode` | none/reference | P0決定どおり、出力へ影響しない | P1 |
| `request_allows_empty_instruction` | `instruction: ""` | 受理 | P1 |
| `request_rejects_unknown_fields` | 任意の追加field | strict Schemaで拒否 | P0 |
| `request_does_not_accept_candidate_or_rejected_entities_as_roots` | Candidate/Reject/Review中ID | 登録済みEntityでないため拒否 | P0 |

## 3. Graph traversal

| ID / テスト名 | 入力・Fixture | 期待結果 | 優先度 |
|---|---|---|---|
| `traversal_depth_zero_includes_only_roots` | Astra / Root Nova Arclight / depth 0 | RootだけをEntityに含む | P0 |
| `traversal_depth_zero_includes_relationship_only_when_both_endpoints_are_roots` | multi-root / Root 2件 | Root間Relationshipだけを含む | P0 |
| `traversal_depth_one_includes_direct_neighbors` | Astra / Root Nova Arclight / outgoing | Corps、Aster Compass、First Light Briefingまで | P0 |
| `traversal_depth_two_includes_second_hop_neighbors` | Astra / Root Nova Arclight / outgoing | Northstar Observatoryまで追加 | P0 |
| `traversal_incoming_follows_only_incoming_edges` | Astra / Root First Light Briefing | Nova ArclightとＮＯＶＡからの`appears_in`を辿る | P0 |
| `traversal_outgoing_follows_only_outgoing_edges` | Astra / Root First Light Briefing | Northstar Observatoryへの`located_at`を辿る | P0 |
| `traversal_both_combines_incoming_and_outgoing_without_duplicates` | Astra / Root First Light Briefing | incomingとoutgoingの和集合、重複なし | P0 |
| `traversal_preserves_original_relationship_direction` | incoming探索 | 出力のfrom/toを反転しない | P0 |
| `traversal_stops_at_cycle_and_keeps_minimum_distance` | cyclic-graph | 無限loopせず、各Entityの最小距離を固定 | P0 |
| `traversal_handles_multiple_roots_deterministically` | multi-root、入力順違い | Root順以外の選択集合が安定 | P1 |
| `traversal_deduplicates_relationships_reached_from_multiple_roots` | multi-root共有edge | Relationshipを1件だけ出力 | P0 |
| `traversal_excludes_blocked_relationships` | AstraのOuter Gate候補 | Knowledgeに未登録のため出力しない | P0 |
| `traversal_does_not_infer_unregistered_relationships` | scene_drafting preset | relationType名から新規edgeを作らない | P0 |
| `traversal_does_not_mutate_knowledge_snapshot` | frozen input | 実行後にdeep equalityが成立 | P0 |

## 4. Entity、Attribute、Conflict投影

| ID / テスト名 | 入力・Fixture | 期待結果 | 優先度 |
|---|---|---|---|
| `entity_projects_root_as_full_entity` | Astra / Nova Arclight | RootはFull、正式IDと5種EntityTypeを維持 | P0 |
| `entity_projects_neighbor_as_full_when_budget_allows` | Astra / 十分なBudget | Neighborの完全情報を含む | P1 |
| `entity_downgrades_neighbor_from_full_to_stub_atomically` | budget-boundaries | Stubは4必須fieldだけを持つ | P0 |
| `entity_never_downgrades_root_to_stub` | 極小Budget | Stub化せずtyped error | P0 |
| `attribute_preserves_canonical_value` | Astra age | canonicalValueは17のまま | P0 |
| `attribute_unresolved_conflict_keeps_all_claims` | Astra age 17/18 | 2claimを保持し`unresolved` | P0 |
| `attribute_resolved_conflict_keeps_all_claims_and_timestamp` | resolved-conflict | 全claim、canonicalValue、resolvedAtを保持し`resolved` | P0 |
| `attribute_distinguishes_number_17_from_string_17` | typed-scalar-conflict | 異なる2値として`unresolved` | P0 |
| `attribute_distinguishes_boolean_true_from_string_true` | synthetic | 異なる2値 | P1 |
| `attribute_stable_value_may_omit_claims_but_keeps_canonical_sources` | conflictState none | 契約どおりclaim省略可、source ID保持 | P1 |
| `attribute_empty_record_maps_to_empty_state` | canonical null、claims空 | `empty` | P1 |
| `attribute_rejects_or_reports_invalid_existing_record_without_repair` | canonical null、claimsあり等 | P0決定のerror/diagnostic。値を自動修復しない | P0 |
| `attribute_sorts_keys_deterministically` | attribute挿入順違い | 同じkey順 | P0 |
| `attribute_sorts_claims_deterministically` | claim配列順違い | 型付き値とsource IDによる同じ順 | P0 |
| `budget_never_partially_removes_root_unresolved_conflict` | 極小Budget | 全保持または`ROOT_CONTENT_EXCEEDS_BUDGET` | P0 |
| `budget_downgrades_neighbor_instead_of_partially_removing_conflict` | NeighborにConflict | Fullの部分claim削除をせずStub化 | P0 |

## 5. SourceRef

| ID / テスト名 | 入力・Fixture | 期待結果 | 優先度 |
|---|---|---|---|
| `source_mode_none_emits_no_sources_or_reference_ids` | 任意Fixture / none | `sources`空、各ref ID空、claim refは条件付きSchemaどおり省略 | P0 |
| `source_mode_reference_emits_document_and_file_without_excerpt` | 任意Fixture / reference | ID、documentId、fileNameのみ | P0 |
| `source_mode_excerpt_emits_excerpt` | 任意Fixture / excerpt | excerptを含む | P0 |
| `source_ref_id_uses_raw_untruncated_triple` | 長いexcerpt | raw tripleのSHA-256と一致 | P0 |
| `source_ref_id_is_stable_across_reference_and_excerpt_modes` | 同一SourceRef、mode違い | IDが同じ | P0 |
| `source_ref_id_remains_stable_after_excerpt_truncation` | unicode-excerpt | 切り詰め前と同じID | P0 |
| `source_ref_deduplicates_identical_raw_triples` | 同一SourceRefをEntity/Relationshipが共有 | `sources`は1件 | P0 |
| `source_ref_keeps_different_excerpts_as_distinct_refs` | 同じdoc/file、excerpt違い | IDもsourceも別 | P1 |
| `source_excerpt_truncates_at_unicode_code_point_boundary` | emojiを境界に含む | surrogateを壊さず切る | P0 |
| `source_excerpt_counts_ellipsis_inside_limit` | limit 1、2、境界値 | 出力code point数がlimit以下 | P0 |
| `source_excerpt_at_exact_limit_is_not_truncated` | 長さ=limit | ellipsisなし、warningなし | P1 |
| `source_excerpt_truncation_sets_warning_and_flag` | 長さ>limit | 固定warningと`excerptTruncated: true` | P0 |
| `source_index_has_no_dangling_reference_ids` | 全modeとBudget削減後 | 全非空IDがちょうど1sourceへ解決 | P0 |
| `source_index_removes_unreferenced_sources_after_reduction` | Relationship省略後 | 参照されないsourceを除去 | P0 |
| `source_ref_does_not_merge_summarize_or_rephrase` | 複数SourceRef | raw内容をAI処理しない | P1 |

## 6. Endpoint ClosureとRelationship

| ID / テスト名 | 入力・Fixture | 期待結果 | 優先度 |
|---|---|---|---|
| `endpoint_closure_includes_both_entities_for_every_relationship` | Astra | 全Relationshipの両端IDがentitiesに存在 | P0 |
| `endpoint_closure_uses_stub_when_full_endpoint_does_not_fit` | budget-boundaries | Relationshipを維持し端点をStub化 | P0 |
| `endpoint_closure_omits_relationship_when_stub_does_not_fit` | さらに小さいBudget | 片端Relationshipを出さず省略IDとwarningを記録 | P0 |
| `relationship_core_is_never_partially_truncated` | 長いdescription、極小Budget | id/from/to/type/descriptionを全保持またはRelationship全体を省略 | P0 |
| `relationship_preserves_direction_for_reverse_pair` | A→BとB→A | 2件として維持 | P0 |
| `relationship_sort_is_deterministic` | 入力配列順違い | from、to、normalized type、id順 | P0 |
| `relationship_source_ids_follow_source_mode` | 3 mode | mode契約どおり | P1 |
| `relationship_omission_removes_endpoint_used_only_by_that_relationship` | synthetic | 非Rootの不要端点も除去 | P1 |
| `relationship_omission_never_removes_a_root_endpoint` | multi-root | Rootは残る | P0 |
| `relationship_output_does_not_rededuplicate_by_inference` | Storeで統合済みRelationship | Storeの正式1件をそのまま投影 | P1 |

## 7. Budget

| ID / テスト名 | 入力・Fixture | 期待結果 | 優先度 |
|---|---|---|---|
| `budget_keeps_output_within_max_characters` | 複数境界値 | final canonical JSONのcode point数が上限以下 | P0 |
| `budget_actual_characters_matches_final_measurement_contract` | hash placeholderを含むBundle | P0決定した測定値と完全一致 | P0 |
| `budget_actual_characters_reaches_stable_fixed_point` | 桁が9→10、99→100へ変わる境界 | 再計算後に値が安定 | P0 |
| `budget_applies_reduction_steps_in_fixed_order` | 全削減候補を含むFixture | 定義済み順で削減 | P0 |
| `budget_produces_same_reduction_for_same_logical_input` | 配列順だけ変更 | omitted/stub/warningsが同じ | P0 |
| `budget_preserves_all_roots` | multi-root | 成功時は全RootがFullで存在 | P0 |
| `budget_fails_when_single_root_mandatory_content_does_not_fit` | budget-boundaries | `ROOT_CONTENT_EXCEEDS_BUDGET` | P0 |
| `budget_fails_instead_of_selecting_subset_of_multiple_roots` | multi-root極小Budget | 全体失敗、一部Bundleなし | P0 |
| `budget_sets_truncated_when_content_is_reduced` | Full→Stubまたは省略 | `truncated: true` | P0 |
| `budget_does_not_set_truncated_when_nothing_is_reduced` | 十分なBudget | `truncated: false` | P1 |
| `budget_records_downgraded_entity_warning_once` | 同じNeighborへ複数edge | warning重複なし | P1 |
| `budget_records_omitted_ids_in_deterministic_order` | 複数省略 | ID順または確定契約順 | P0 |
| `budget_warning_messages_use_fixed_templates` | 同一削減 | 文言と順序が一致 | P1 |
| `budget_does_not_truncate_description_or_relation_type_strings` | 長い文字列 | 原子的保持または上位単位省略/失敗 | P0 |
| `budget_for_json_does_not_claim_to_bound_markdown_size` | Markdown renderer | JSON Budgetと表示サイズを混同しない | P2 |

## 8. Deterministic sort、canonical JSON、digest

| ID / テスト名 | 入力・Fixture | 期待結果 | 優先度 |
|---|---|---|---|
| `sort_places_roots_in_deduplicated_request_order` | Root `[B,A,B]` | `[B,A]`が先頭 | P0 |
| `sort_orders_neighbors_by_contract` | Entity入力順違い | entityType、normalized name、id順 | P0 |
| `sort_orders_reference_id_arrays_deterministically` | sourceRefs順違い | 同じID順 | P0 |
| `sort_orders_sources_and_warnings_deterministically` | 挿入順違い | 同じ順序 | P0 |
| `canonical_json_recursively_sorts_object_keys` | 深いattributesのkey順違い | 同一canonical JSON | P0 |
| `canonical_json_preserves_domain_array_order` | 事前sort済み配列 | canonicalizerが配列を勝手に再sortしない | P0 |
| `canonical_json_does_not_depend_on_locale` | locale切替可能なtest環境 | 同一出力 | P1 |
| `canonical_json_rejects_non_finite_numbers` | NaN、Infinity | 検証エラー | P0 |
| `source_snapshot_digest_is_identical_for_same_logical_input` | 同一Knowledge/request、入力順違い | 同じdigest | P0 |
| `source_snapshot_digest_changes_when_selected_knowledge_changes` | claim/Relationship変更 | digestが変わる | P0 |
| `source_snapshot_digest_changes_when_normalized_request_changes` | depth、direction、sourceMode、Budget等変更 | P0決定した対象どおり変わる | P0 |
| `source_snapshot_digest_ignores_bundle_id_and_generated_at` | Clock/IDだけ変更 | digest不変 | P0 |
| `bundle_digest_is_identical_for_same_bundle_instance_content` | Clock/ID固定 | 同じdigest | P0 |
| `bundle_digest_changes_when_bundle_content_changes` | warning、stub、instruction等変更 | digestが変わる | P0 |
| `bundle_digest_uses_empty_own_hash_field` | 既知vector | 自己参照せず期待SHA-256と一致 | P0 |
| `bundle_digest_distinguishes_instances_when_clock_or_id_changes` | source snapshot同一、Clock/ID違い | P0決定どおりbundle digestだけ変化 | P1 |
| `example_source_ref_hashes_match_documented_values` | 現synthetic JSON | 3件すべて一致 | P1 |
| `example_bundle_hash_matches_recursive_canonical_json` | 現synthetic JSON | 現契約vectorと一致。ただしP0修正後はfixture更新 | P1 |

## 9. Diagnosticsとエラー

| ID / テスト名 | 入力・Fixture | 期待結果 | 優先度 |
|---|---|---|---|
| `diagnostics_counts_included_unresolved_conflicts` | Astra | P1決定した出力後件数=1 | P0 |
| `diagnostics_warns_when_unresolved_conflict_is_included` | Astra Nova | `UNRESOLVED_CONFLICT_INCLUDED`を1件 | P1 |
| `diagnostics_reports_entity_downgrade` | budget-boundaries | 対象Entity ID付きwarning | P0 |
| `diagnostics_reports_relationship_omission` | budget-boundaries | 対象Relationship ID付きwarning | P0 |
| `diagnostics_reports_excerpt_truncation` | unicode-excerpt | SourceRef ID付きwarning | P0 |
| `diagnostics_distinguishes_absent_data_from_budget_omission` | aliases元空 / aliases省略 | field omission記録で区別 | P0 |
| `errors_return_no_partial_bundle_on_root_budget_failure` | 極小Budget | typed errorのみ | P0 |
| `errors_are_stable_and_machine_readable` | 同一失敗 | codeが固定、message依存で判定しない | P1 |

## 10. Project Astra適合

| ID / テスト名 | 入力・Fixture | 期待結果 | 優先度 |
|---|---|---|---|
| `astra_fixture_uses_official_final_knowledge_ids_and_names` | frozen Astra | 公式7 Entity、5 Relationshipを使用 | P0 |
| `astra_nova_depth_one_contains_registered_direct_neighbors` | Root Nova Arclight | Corps、Compass、Briefingと3 edge | P0 |
| `astra_nova_depth_two_reaches_northstar_observatory` | outgoing depth 2 | Briefing経由でObservatoryを含む | P0 |
| `astra_briefing_directions_match_registered_edges` | Root Briefing | incoming 2件、outgoing 1件、both 3件 | P0 |
| `astra_age_conflict_is_number_17_vs_number_18` | Nova age | string `"17"`を混入させない | P0 |
| `astra_member_of_is_already_deduplicated` | final Knowledge | Relationship 1件、SourceRef 2件 | P1 |
| `astra_blocked_outer_gate_relationship_is_absent` | final Knowledge | Contextへ含めない | P0 |
| `astra_quiet_prism_can_be_selected_as_orphan_root` | Root Quiet Prism | Rootだけで生成可能、未登録edgeを推測しない | P1 |
| `astra_example_is_not_used_as_official_fixture` | fixture registry | 現JSONはsynthetic分類 | P0 |
| `astra_official_fixture_waits_for_project_freeze` | repository state | 未凍結v0.1をgolden snapshotにしない | P1 |

## 11. Markdown renderer（任意stretch / Build Week後）

| ID / テスト名 | 入力・Fixture | 期待結果 | 優先度 |
|---|---|---|---|
| `markdown_renders_from_context_bundle_only` | 完成Bundle | Storeを再読込せず同じ内容を表示 | P2 |
| `markdown_separates_instruction_from_knowledge` | instructionあり | 別見出しで混入しない | P2 |
| `markdown_places_unresolved_conflict_warning_before_entities` | Conflictあり | 規定順で警告 | P2 |
| `markdown_preserves_relationship_direction` | A→B | 表示でも反転しない | P2 |
| `markdown_renders_stub_as_stub_without_invented_fields` | Stub Entity | name/type/id以上を推測しない | P2 |
| `markdown_renders_source_mode_without_leaking_excerpt` | none/reference | excerptを表示しない | P2 |
| `markdown_is_deterministic_for_same_bundle` | 同一Bundle | snapshot一致 | P2 |
| `markdown_is_not_used_as_digest_or_import_source` | renderer連携 | canonical JSONだけが正本 | P2 |

## 12. 3契約の非干渉回帰

| ID / テスト名 | 入力・Fixture | 期待結果 | 優先度 |
|---|---|---|---|
| `context_generation_does_not_mutate_knowledge_store` | frozen Store | 生成前後のdeep equalityとExport snapshot一致 | P0 |
| `context_generation_does_not_change_knowledge_base_export_schema` | 既存Export test | 既存golden JSON不変 | P0 |
| `context_generation_does_not_change_candidate_bundle_schema` | 既存Candidate test | create-only、正式ID/action/merge先なし | P0 |
| `context_bundle_is_rejected_by_knowledge_base_import` | Import境界 | Contextを復元payloadとして受理しない | P0 |
| `ai_result_is_not_applied_directly_to_knowledge` | Return flow | 自動更新なし | P0 |
| `structured_ai_result_enters_candidate_review_only` | Return flow | ソース再取込とCandidate Reviewを通る | P1 |
| `draft_metadata_does_not_modify_entity_relationship_or_attribute_contracts` | Draft保存 | metadataは別管理 | P2 |
| `existing_entity_resolution_rules_remain_exact_match_only` | Context追加後の既存test | NFKC等の完全一致規則が不変 | P0 |
| `existing_relationship_direction_and_dedup_rules_remain_unchanged` | 既存test | from/to/type key不変 | P0 |

## 13. 実行順と受け入れ条件

将来テスト環境ができたら、次の順で実行する。

1. 既存のtypecheck、unit test、integration test、lintを変更前に実行する。
2. Request、traversal、Attribute、SourceRefのP0 unit testを実行する。
3. Endpoint ClosureとBudgetのP0 testを実行する。
4. canonical JSONとdigestのknown vector testを実行する。
5. official Astraとsynthetic fixture testを実行する。
6. Candidate Bundle、Knowledge Base Export、Knowledge Store非変更の回帰testを実行する。
7. 実装した場合だけMarkdown renderer testを実行する。
8. 最後に全test、typecheck、lintを再実行する。

受け入れ条件は次のとおり。

- P0が全件成功する。
- Build Week stretchとして含めたP1が全件成功する。
- 成功Bundleは常にSchema適合、Endpoint Closure成立、上限内である。
- Rootとresolved/unresolved Conflictが部分削除されない。
- 同じ論理入力のsortとsource snapshot digestが一致する。
- 既存Candidate Bundle、Knowledge Base Export、Entity照合、Relationship規則の回帰がない。
- 現行コードが存在しない間は、テスト未実行を成功扱いしない。

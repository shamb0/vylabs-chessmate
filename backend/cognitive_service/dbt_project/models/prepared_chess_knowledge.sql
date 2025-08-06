-- models/prepared_chess_knowledge.sql
{{
  config(
    materialized='table'
  )
}}

WITH source AS (
    SELECT
        *,
        ROW_NUMBER() OVER(PARTITION BY fen_after_move, comment ORDER BY game_id) as rn
    FROM {{ ref('stg_pgn_moves') }}
    WHERE comment IS NOT NULL
      AND length(trim(comment)) > 10
),
enhanced_moves AS (
  SELECT
    {{ dbt_utils.generate_surrogate_key(['fen_after_move', 'comment']) }} as knowledge_id,
    fen_after_move as fen,
    regexp_replace(fen_after_move, ' \\d+ \\d+$', ' 0 1') as fen_normalized,
    substring(fen_after_move from '^([^ ]+ [^ ]+)') as fen_positional,
    comment as move_annotation,
    -- Basic NLP to determine context_type from comments
    CASE
        WHEN lower(comment) LIKE '%opening%' THEN 'opening'
        WHEN lower(comment) LIKE '%middlegame%' THEN 'middlegame'
        WHEN lower(comment) LIKE '%endgame%' THEN 'endgame'
        WHEN lower(comment) LIKE '%tactic%' THEN 'tactic'
        WHEN lower(comment) LIKE '%strategy%' THEN 'strategy'
        ELSE 'general_commentary'
    END AS context_type,
    -- Placeholder for cognitive stage
    'novice' as cognitive_stage,
    -- Placeholder for future metadata enrichment
    json_build_object('white_title', 'GM') as game_metadata,
    CASE
      WHEN length(comment) > 50 THEN 1.0
      -- Example of using future metadata
      -- WHEN game_metadata->>'white_title' = 'GM' THEN 0.9
      ELSE 0.7
    END as quality_score
  FROM source
  WHERE rn = 1
)

SELECT
  knowledge_id,
  fen,
  fen_normalized,
  fen_positional,
  move_annotation as content,
  context_type,
  cognitive_stage,
  game_metadata as source_metadata,
  quality_score,
  current_timestamp as created_at
FROM enhanced_moves
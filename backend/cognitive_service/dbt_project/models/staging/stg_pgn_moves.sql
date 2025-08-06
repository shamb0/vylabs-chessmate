SELECT
    game_id,
    move_san,
    fen_after_move,
    comment,
    cognitive_stage,
    coaching_style_id,
    cultural_context_id,
    language,
    _dlt_load_id,
    _dlt_id
FROM {{ source('staged_pgn_data_source', 'games_resource') }}

"""
ChessMate Cognitive Service - DLT Ingestion Only

This script implements the dlt ingestion portion of the pipeline.
Its sole responsibility is to load data from PGN files into the database.
"""
import argparse
import glob
import logging
import os
import sys

# Add the project root to the Python path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, PROJECT_ROOT)

import dlt
import structlog

from app.core.pgn_parser import PGNParser
from app.core.metrics import DataQualityMetrics

DATA_DIR = os.path.join(PROJECT_ROOT, 'data')
LOG_DIR = os.path.join(PROJECT_ROOT, 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(level=logging.INFO, format="%(message)s")
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)
log = structlog.get_logger("dlt_ingest_only")

@dlt.source
def pgn_games(data_dir: str = DATA_DIR, sample_percentage: int = 100):
    pgn_files = glob.glob(os.path.join(data_dir, '*.pgn'))
    metrics = DataQualityMetrics()

    @dlt.resource(write_disposition="append", primary_key=("game_id", "fen_after_move"))
    def games_resource():
        for pgn_file_path in pgn_files:
            metrics.files_processed += 1
            log.info("Processing file...", file=pgn_file_path)
            parser = PGNParser(pgn_file_path, None)
            for game_data in parser.parse_stream(metrics, sample_percentage):
                game_id = f"{game_data['headers'].get('White', 'Unknown')}_vs_{game_data['headers'].get('Black', 'Unknown')}_{game_data['headers'].get('Date', 'UnknownDate')}"
                for move in game_data['moves']:
                    if move['comment']:
                        yield {
                            "game_id": game_id,
                            "move_san": move['san'],
                            "fen_after_move": move['fen'],
                            "comment": move['comment'],
                            "cognitive_stage": "developing",
                            "coaching_style_id": 1,
                            "cultural_context_id": 1,
                            "language": "en"
                        }
        metrics.print_summary()

    return games_resource

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest PGN data using DLT.")
    parser.add_argument(
        '--sample',
        type=int,
        default=100,
        help='Percentage of each PGN file to parse. Default is 100.'
    )
    args = parser.parse_args()

    if not 1 <= args.sample <= 100:
        raise ValueError("Sample percentage must be between 1 and 100.")

    from urllib.parse import urlparse

    db_url = os.environ.get("POSTGRES_URL")
    if not db_url:
        raise ValueError("POSTGRES_URL environment variable not set.")
    
    parsed_url = urlparse(db_url)
    
    credentials = {
        "database": parsed_url.path[1:],
        "password": parsed_url.password,
        "username": parsed_url.username,
        "host": parsed_url.hostname,
    }
    
    pipeline = dlt.pipeline(
        pipeline_name="chessmate_pgn_ingestion",
        destination=dlt.destinations.postgres(credentials=credentials),
        dataset_name="staged_pgn_data"
    )

    log.info("Starting PGN data ingestion...")
    load_info = pipeline.run(pgn_games(sample_percentage=args.sample))
    log.info(load_info)
    log.info("PGN data ingestion complete.")

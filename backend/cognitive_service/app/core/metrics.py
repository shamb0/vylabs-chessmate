"""ChessMate Cognitive Service - Data Quality Metrics

This module defines the data structures used for tracking the quality
and progress of data ingestion pipelines.

Author: Vyaakar Labs <r.raajey@gmail.com>
Location: India
License: MIT
"""
from dataclasses import dataclass


@dataclass
class DataQualityMetrics:
    """A dataclass to hold metrics for the PGN ingestion process."""
    files_processed: int = 0
    games_found: int = 0
    games_processed: int = 0
    games_skipped_corruption: int = 0
    games_skipped_unhandled_error: int = 0

    def print_summary(self):
        """Prints a formatted summary of the ingestion metrics."""
        print("\n--- Ingestion Summary ---")
        print(f"Files Processed: {self.files_processed}")
        print(f"Total Games Found: {self.games_found}")
        print(f"Games Successfully Processed: {self.games_processed}")

        total_skipped = self.games_skipped_corruption + self.games_skipped_unhandled_error
        print(f"Total Games Skipped: {total_skipped}")

        if total_skipped > 0:
            print(f"  - Due to corruption (illegal moves): {self.games_skipped_corruption}")
            print(f"  - Due to unhandled errors: {self.games_skipped_unhandled_error}")

        if self.games_found > 0:
            success_rate = (self.games_processed / self.games_found) * 100
            print(f"Success Rate: {success_rate:.2f}%")
        print("-------------------------\n")

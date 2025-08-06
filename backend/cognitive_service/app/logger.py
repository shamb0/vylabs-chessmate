"""ChessMate Cognitive Service - Logger Configuration

This file configures a structured, centralized logger using structlog.
Adheres to the project's coding standards for high-value, low-noise logging.

Author: Vyaakar Labs <r.raajey@gmail.com>
Location: India
License: MIT
"""
import datetime
import logging
import sys

import structlog


# Custom processor to convert UTC timestamps to IST
def to_ist(logger, method_name, event_dict):
    event_dict["timestamp"] = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5, minutes=30))).strftime("%Y-%m-%d %H:%M:%S")
    return event_dict

def setup_logging():
    """
    Configures structlog for the application.
    """
    logging.basicConfig(
        level=logging.INFO,
        format="%(message)s",
        stream=sys.stdout,
    )

    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            to_ist,
            structlog.processors.StackInfoRenderer(),
            structlog.dev.set_exc_info,
            structlog.dev.ConsoleRenderer(),
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

# Call setup function immediately to configure logging upon import
setup_logging()

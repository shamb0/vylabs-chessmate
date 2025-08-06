import asyncio
import logging
import os
import signal

import structlog
from google.adk.runners import InMemoryRunner, Runner
from google.adk.sessions.database_session_service import DatabaseSessionService

from app.agent_io_service import AgentIOService
from app.agents.root_agent import create_root_agent, create_illegal_move_root_agent
from app.config import settings, configure_llm_provider, create_llm_model

log = structlog.get_logger()


async def main():
    """
    Main entry point for the ChessMate Cognitive Service.
    """
    # --- High-Value ADK Trace Configuration ---
    # The following lines are critical for debugging the ADK framework.
    # They configure the root 'google_adk' logger to output DEBUG level
    # messages, providing deep insight into the internal operations of agents,
    # planners, and tool-calling mechanisms.

    adk_logger = logging.getLogger("google_adk")
    adk_logger.setLevel(logging.DEBUG)
    stream_handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    stream_handler.setFormatter(formatter)
    adk_logger.addHandler(stream_handler)
    adk_logger.propagate = False
    # --- End ADK Trace Configuration ---

    log.info("-------------------------------------------------")
    log.info("--- Starting ChessMate Cognitive Service... ---")
    log.info("-------------------------------------------------")

    agent_io_service = None
    try:
        # 1. Log the configuration
        log.info("Configuration loaded.", config=settings.model_dump())

        # 2. Configure and create the LLM model
        configure_llm_provider(settings)
        llm_model = create_llm_model(settings)
        log.info("LLM model created successfully.")

        # 3. Create the root agents, injecting the model dependency
        legal_move_agent = create_root_agent(model=llm_model)
        illegal_move_agent = create_illegal_move_root_agent(model=llm_model)
        log.info("All root agents created successfully.")

        # 4. Create the runners
        app_env = os.environ.get("APP_ENV", "production")
        log.info("Application environment detected.", app_env=app_env)

        if app_env == "test":
            log.info("Creating ADK InMemoryRunners for test environment...")
            legal_move_runner = InMemoryRunner(
                app_name="ChessMateLegalMoveAgentsCoach", agent=legal_move_agent
            )
            illegal_move_runner = InMemoryRunner(
                app_name="ChessMateLegalMoveAgentsCoach", agent=illegal_move_agent
            )
        else:
            log.info("Creating ADK Runners with DatabaseSessionService...")
            session_service = DatabaseSessionService(db_url=settings.postgres_url)
            legal_move_runner = Runner(
                app_name="ChessMateLegalMoveAgentsCoach",
                agent=legal_move_agent,
                session_service=session_service,
            )
            illegal_move_runner = Runner(
                app_name="ChessMateLegalMoveAgentsCoach",
                agent=illegal_move_agent,
                session_service=session_service,
            )
        log.info("ADK Runners created.")

        # 5. Create and start the AgentIOService
        log.info("Creating AgentIOService...")
        agent_io_service = AgentIOService(
            settings,
            legal_move_runner=legal_move_runner,
            illegal_move_runner=illegal_move_runner,
        )

        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(
                sig,
                lambda s=sig: asyncio.create_task(shutdown(s, agent_io_service))
            )

        log.info("Starting Agent IO Service listener...")
        await agent_io_service.start()

    except asyncio.CancelledError:
        log.info("Main task cancelled.")
    except Exception:
        log.exception("A critical error occurred during service startup.")
        raise
    finally:
        if agent_io_service:
            await agent_io_service.shutdown()
        log.info("--- ChessMate Cognitive Service has shut down. ---")


async def shutdown(sig: signal.Signals, service: AgentIOService):
    """
    Gracefully shut down the application.
    """
    log.info(f"Received exit signal {sig.name}...")

    # First, shut down the service to stop accepting new work
    await service.shutdown()

    # Then, cancel all other running tasks
    tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
    for task in tasks:
        task.cancel()

    log.info(f"Cancelling {len(tasks)} outstanding tasks")
    await asyncio.gather(*tasks, return_exceptions=True)

    # Finally, stop the event loop
    asyncio.get_running_loop().stop()


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, asyncio.exceptions.CancelledError):
        log.info("Application event loop stopped.")
    except Exception:
        log.exception("The application failed to start. Please check the logs above for details.")
        exit(1)

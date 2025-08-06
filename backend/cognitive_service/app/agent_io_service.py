"""ChessMate Cognitive Service - Agent IO Service

This service acts as the bridge between the Redis event bus and the
ADK-based cognitive core. It listens for game state changes, translates
them into requests for the ADK, and publishes the ADK's responses back
to the event bus.

Author: Vyaakar Labs <r.raajey@gmail.com>
Location: India
License: MIT
"""

import asyncio
import json
import re
import time
from typing import Optional

import redis.asyncio as aioredis
import structlog
from google.adk.runners import Runner
from google.adk.sessions.session import Session
from google.genai.types import Part, UserContent

from app.config import settings

log = structlog.get_logger()


class ChessMateError(Exception):
    """Custom exception for the ChessMate Cognitive Service."""

    def __init__(
        self, message: str, error_code: str, context: Optional[dict] = None
    ):
        super().__init__(message)
        self.error_code = error_code
        self.context = context or {}


class AgentIOService:
    """
    Manages the connection to the Redis event bus and handles the
    flow of information to and from the ADK service.
    """

    def __init__(
        self,
        config: settings,
        legal_move_runner: Runner,
        illegal_move_runner: Runner,
    ):
        self.config = config
        self.log = log.bind(service=self.__class__.__name__)
        self.redis_client: Optional[aioredis.Redis] = None
        self.legal_move_runner = legal_move_runner
        self.illegal_move_runner = illegal_move_runner
        self.log.info("AgentIOService initialized.")

    async def start(self) -> None:
        """
        Connects to Redis and starts listening for messages.
        """
        self.log.info("Starting service")
        await self._connect_to_redis()
        await self._listen_for_work_queue_messages()

    async def _connect_to_redis(self):
        """
        Establishes a connection to the Redis server.
        """
        while True:
            try:
                self.redis_client = aioredis.from_url(
                    self.config.redis_url,
                    decode_responses=True,
                )
                await self.redis_client.ping()
                self.log.info("Successfully connected to Redis.")
                break
            except aioredis.exceptions.ConnectionError as e:
                self.log.error(
                    "Could not connect to Redis. Retrying in 5 seconds...", error=str(e)
                )
                await asyncio.sleep(5)

    async def _listen_for_work_queue_messages(self):
        """Enhanced listener with detailed consumption logging"""
        self.log.info("🔍 [PYTHON_LISTENER] Starting enhanced work queue listener...")
        queues = ["coaching_work_queue", "illegal_move_work_queue"]
        
        while True:
            try:
                if not self.redis_client:
                    self.log.error("❌ [PYTHON_LISTENER] Redis client unavailable")
                    await asyncio.sleep(5)
                    continue

                # 🔍 PRE-BLPOP: Check queue states
                total_waiting = 0
                for queue in queues:
                    length = await self.redis_client.llen(queue)
                    if length > 0:
                        total_waiting += length
                        self.log.info("📋 [PYTHON_LISTENER] Messages waiting in queue", 
                                    queue=queue, length=length)

                if total_waiting == 0:
                    self.log.info("⏳ [PYTHON_LISTENER] No messages waiting, blocking for new arrivals...")
                
                # 🔍 TIME THE BLPOP OPERATION
                start_time = time.time()
                self.log.info("🔍 [PYTHON_LISTENER] About to call BLPOP", 
                            queues=queues, 
                            timeout="indefinite",
                            total_waiting=total_waiting)

                # ⚡ CRITICAL: This might be consuming messages immediately
                queue_name, message_json = await self.redis_client.blpop(keys=queues)
                
                consumption_time = time.time() - start_time
                self.log.info("⚡ [PYTHON_CONSUMER] Message consumed successfully", 
                            queue=queue_name,
                            consumption_time_ms=round(consumption_time * 1000, 2),
                            message_size=len(message_json) if message_json else 0,
                            was_waiting=total_waiting > 0)

                if message_json:
                    # 🔍 DETAILED MESSAGE ANALYSIS
                    self.log.info("📥 [PYTHON_PROCESSOR] Processing consumed message",
                                queue=queue_name,
                                raw_message_preview=message_json[:100],
                                message_length=len(message_json))
                    
                    try:
                        message = json.loads(message_json)
                        
                        # 🎯 LOG MESSAGE DETAILS
                        self.log.info("✅ [PYTHON_PROCESSOR] Message parsed successfully",
                                    message_type=message.get('type'),
                                    client_id=message.get('ws_client'),
                                    trace_id=message.get('traceId'),  # From Node.js
                                    message_keys=list(message.keys()),
                                    processing_queue=queue_name)
                        
                        # Process based on queue
                        if queue_name == "coaching_work_queue":
                            self.log.info("🎯 [PYTHON_ROUTER] Routing to coaching processor")
                            asyncio.create_task(self.process_game_state_change(message))
                        elif queue_name == "illegal_move_work_queue":  
                            self.log.info("🎯 [PYTHON_ROUTER] Routing to illegal move processor")
                            asyncio.create_task(self.process_illegal_move(message))
                        else:
                            self.log.warning("❓ [PYTHON_ROUTER] Unknown queue", queue=queue_name)
                            
                    except json.JSONDecodeError as e:
                        self.log.error("❌ [PYTHON_PROCESSOR] JSON decode failed", 
                                    error=str(e), 
                                    raw_message=message_json[:200])
                else:
                    self.log.warning("❓ [PYTHON_CONSUMER] BLPOP returned None message")

            except Exception as e:
                self.log.exception("❌ [PYTHON_LISTENER] Error in work queue listener", 
                                error=str(e))
                await asyncio.sleep(1)

    async def _get_or_create_session(self, client_id: str, runner: Runner) -> Session:
        """
        Retrieves a session for a client, creating it if it doesn't exist.
        """
        existing_sessions = await runner.session_service.list_sessions(
            app_name="ChessMateLegalMoveAgentsCoach", user_id=client_id
        )
        if existing_sessions.sessions:
            session_id = existing_sessions.sessions[0].id
            self.log.info(
                "Found existing session.", session_id=session_id, client_id=client_id
            )
            session = await runner.session_service.get_session(
                app_name="ChessMateLegalMoveAgentsCoach", user_id=client_id, session_id=session_id
            )
            if session:
                return session

        self.log.info(
            "No existing session found, creating a new one.", client_id=client_id
        )
        session = await runner.session_service.create_session(
            app_name="ChessMateLegalMoveAgentsCoach", user_id=client_id
        )
        self.log.info(
            "New session created.", session_id=session.id, client_id=client_id
        )
        return session

    async def process_game_state_change(self, message: dict):
        """
        Processes a game state change message for a legal move.
        """
        ws_client = message.get("ws_client")
        if not ws_client:
            self.log.error("No ws_client in message", message=message)
            return

        try:
            session = await self._get_or_create_session(ws_client, self.legal_move_runner)
            fen = message.get("game", {}).get("fen")
            if not fen:
                self.log.error("No FEN in message", message=message)
                return

            self.log.info(
                "Processing game state change with session.",
                fen=fen,
                session_id=session.id,
            )
            content = UserContent(parts=[Part(text=str(message))])
            response_content = ""
            async for event in self.legal_move_runner.run_async(
                user_id=ws_client,
                session_id=session.id,
                new_message=content,
                state_delta={"fen": fen},
            ):
                if event.content and event.content.parts and event.content.parts[0].text:
                    response_content = event.content.parts[0].text

            coaching_response = {"coaching_message": response_content}
            await self.publish_coaching_message(coaching_response, ws_client)

        except Exception as e:
            self.log.exception(
                "An error occurred during ADK execution for legal move.",
                error=str(e),
                exc_info=True
            )
            await self.publish_coaching_message({"coaching_message": "{}"}, ws_client, is_error=True)


    async def process_illegal_move(self, message: dict):
        """Processes an illegal move event by invoking the illegal move runner."""
        ws_client = message.get("ws_client")
        trace_id = message.get("traceId", "no-trace")

        self.log.info(
            "🚀 [ILLEGAL_MOVE_PROCESSOR] Starting illegal move processing",
            client_id=ws_client,
            trace_id=trace_id,
            message_keys=list(message.keys()),
        )

        if not ws_client:
            self.log.error(
                "❌ [ILLEGAL_MOVE_PROCESSOR] No ws_client in message",
                message=message,
                trace_id=trace_id,
            )
            return

        try:
            session = await self._get_or_create_session(
                ws_client, self.illegal_move_runner
            )
            fen = message.get("fen")
            if not fen:
                self.log.error("No FEN in message for illegal move", message=message)
                return

            self.log.info(
                "Processing illegal move with session.",
                fen=fen,
                session_id=session.id,
            )

            state_delta={
                "current_fen": fen,
                "attempted_move": f"{message.get('from')}{message.get('to')}",
                "legal_moves": ", ".join(message.get('legalMoves', [])),
            }

            response_content = ""
            async for event in self.illegal_move_runner.run_async(
                user_id=ws_client,
                session_id=session.id,
                new_message=UserContent(parts=[Part(text="An illegal move was attempted.")]),
                state_delta=state_delta,
            ):
                if (
                    event.content
                    and event.content.parts
                    and event.content.parts[0].text
                ):
                    response_content = event.content.parts[0].text

            coaching_response = {"coaching_message": response_content}
            await self.publish_coaching_message(coaching_response, ws_client)

            self.log.info(
                "📤 [ILLEGAL_MOVE_PROCESSOR] Response published successfully",
                client_id=ws_client,
                trace_id=trace_id,
            )

        except Exception as e:
            self.log.exception(
                "❌ [ILLEGAL_MOVE_PROCESSOR] Processing failed",
                client_id=ws_client,
                trace_id=trace_id,
                error=str(e),
            )

            await self.publish_coaching_message(
                {"coaching_message": "{}"}, ws_client, is_error=True
            )

    async def shutdown(self):
        """
        Gracefully shuts down the service.
        """
        self.log.info("Shutting down Agent IO Service...")
        if self.redis_client:
            await self.redis_client.close()
            self.log.info("Redis connection closed.")

    async def publish_coaching_message(self, coaching_response: dict, ws_client: str, is_error: bool = False):
        """
        Publishes the coaching message to the Redis event bus.
        """
        response_text = coaching_response.get("coaching_message", "{}")
        try:
            if self.redis_client:
                if is_error:
                     payload_object = { "message": "I'm sorry, I seem to be having some trouble thinking right now. Let's try again in a moment." }
                else:
                    json_match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
                    if json_match:
                        response_text = json_match.group(1)
                    payload_object = json.loads(response_text)

                message_to_publish = {
                    "type": "coaching:message_ready",
                    "ws_client": ws_client,
                    "payload": payload_object
                }
                await self.redis_client.publish(
                    "coaching:message_ready", json.dumps(message_to_publish)
                )
                self.log.info("Published coaching message", response=message_to_publish)
        except json.JSONDecodeError:
            self.log.error("Failed to decode JSON from agent response", response=response_text)
            fallback_payload = {
                "type": "coaching:message_ready",
                "ws_client": ws_client,
                "payload": {
                    "message": "I seem to be having trouble structuring my thoughts. Please try again."
                }
            }
            await self.redis_client.publish(
                "coaching:message_ready", json.dumps(fallback_payload)
            )
        except Exception as e:
            self.log.exception("Error publishing coaching message")
            raise ChessMateError(
                "Error publishing coaching message",
                "PUBLISH_ERROR",
                {"response": coaching_response},
            ) from e

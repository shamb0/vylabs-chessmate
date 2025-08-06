# Default recipe
default: list

# Setup the full development environment
setup: setup-adk db-install-pgai setup-models
    @echo "✅ Full environment setup complete."

# Clone the Google ADK repository if it doesn't already exist
setup-adk:
    if [ ! -d "backend/cognitive_service/deps/adk-python" ]; then \
        git clone https://github.com/google/adk-python.git backend/cognitive_service/deps/adk-python; \
    fi

# Start all services in detached mode
start env='production':
    @echo "Starting services in {{env}} mode..."
    APP_ENV={{env}} docker compose up -d --build backend-node cognitive-service-py

# Start frontend and all backend services in detached mode
start-frontend flags="":
    @echo "Starting frontend-dev and all backend services with flags: {{flags}}"
    docker compose build {{flags}} frontend-dev
    docker compose up -d frontend-dev

# Stop all services
stop:
    @docker compose stop redis-monitor redis ollama genai-toolbox vectorizer-worker traefik backend-node
    @docker container prune
    @docker compose stop postgres

# Run the integration test suite
# TODO: Create integration test suite (e.g., tests/integration/e2e.spec.ts)
# test-integration:
#     @echo "Running containerized integration tests..."
#     docker compose run --rm test-runner

# Run the integration test suite in the production environment
test-prod:
    @echo "Running integration tests in production environment..."
    just start env='production'
    just test-integration
    just stop


# Pull required models into the Ollama container
setup-models:
    @echo "Pulling required LLM models..."
    @docker compose exec ollama ollama pull gemma3n:e4b-it-q4_K_M 
    @docker compose exec ollama ollama pull nomic-embed-text
    @echo "✅ Models pulled successfully."

# View logs for all services
logs:
    docker compose logs -f

# View logs for a specific service
logs-service *service_name:
    docker compose logs -f {{service_name}}

# Check the status of all running services
status:
    @echo "Verifying service status..."
    @docker compose ps
    @echo "\nVerifying backend-node logs..."
    @echo "\nVerifying backend-node logs..."
    @docker compose logs backend-node | grep "ChessMate backend services are running" || true
    @echo "\nVerifying cognitive-service-py health..."
    @docker compose ps | grep "cognitive-service-py" | grep "(healthy)" || echo "Cognitive service is not healthy yet..."

# Run tests (placeholder for now)
test:
    echo "Running tests..."

# Run frontend unit tests in an isolated container
test-frontend-unit flags="":
    @echo "Building and starting frontend test runner..."
    @docker compose build {{flags}} frontend-test-runner
    @docker compose up -d --wait frontend-test-runner
    @echo "Running frontend unit tests..."
    @docker compose exec frontend-test-runner bash -c 'npm run test:unit | npx roarr-cli pretty-print'

# Run frontend E2E tests using the Vitest test runner
test-e2e-vitest flags="":
    @echo "Building and starting frontend e2e test runner..."
    @docker compose build {{flags}} frontend-integration-test-runner
    @echo "Running frontend E2E tests with Vitest..."
    @docker compose run --rm frontend-integration-test-runner bash -c 'npm install && npm run test:e2e:vitest | npx roarr-cli pretty-print'

# Run Playwright E2E tests in isolated environment
test-e2e-pw flags="" *args="":
    #!/usr/bin/env bash
    set -euo pipefail
    echo " Starting isolated Playwright E2E tests..."
    
    # Build the isolated Playwright environment
    docker compose build {{flags}} frontend-pw-test-runner    
   
    # Run Playwright tests in isolated environment
    echo " Running Playwright tests..."
    docker compose run --rm frontend-pw-test-runner npx playwright test {{args}}
    
    # Cleanup
    docker compose down frontend-pw-test-runner

# Run a specific Playwright E2E test in headed (UI) mode for debugging
test-e2e-pw-headed flags="":
    #!/usr/bin/env bash
    set -euo pipefail
    echo " Starting HELLO WORLD headed Playwright E2E test..."
    
    # Ensure the host directory exists with correct permissions before mounting.
    mkdir -p ./frontend/traces
    
    # Build the isolated Playwright environment
    docker compose build {{flags}} frontend-pw-test-runner    
   
    # Run the specific headed test
    echo " Running Playwright test in headed mode..."
    docker compose run --rm frontend-pw-test-runner xvfb-run npx playwright test src/tests/e2e/smoke-headed.spec.pw.ts --headed --trace on
    
    # Cleanup
    docker compose down frontend-pw-test-runner

# Clean the Playwright traces directory
clean-pw-traces:
    @echo "Cleaning Playwright traces directory..."
    @rm -rf ./frontend/traces
    @echo "✅ Traces directory cleaned."

# Show the latest Playwright trace file
show-pw-latest-trace:
    #!/usr/bin/env bash
    set -euo pipefail
    LATEST_TRACE=$(find ./frontend/traces -name "trace.zip" -print0 | xargs -0 ls -t | head -n 1)
    if [ -z "$LATEST_TRACE" ]; then
        echo "No trace.zip files found in ./frontend/traces"
        exit 1
    fi
    echo "Showing latest trace: $LATEST_TRACE"
    bunx playwright show-trace "$LATEST_TRACE"



# Static analysis and type checking
typecheck:
    @echo "Running MyPy type checker..."
    docker compose run --rm cognitive-service-tools mypy .

typecheck-frontend:
    @echo "Running TypeScript type checker for frontend..."
    docker compose run --rm frontend bunx tsc --noEmit

# Run Ruff linter for code quality and style checks
lint: # Run Ruff linter for code quality and style checks
    @echo "Running Ruff linter..."
    docker compose run --rm cognitive-service-tools ruff check .

lint-frontend:
    @echo "Running ESLint for frontend..."
    docker compose run --rm frontend bunx eslint src/

# Automatically fix fixable linting errors
lint-fix:
    @echo "Running Ruff linter to automatically fix errors..."
    docker compose run --rm cognitive-service-tools ruff check . --fix

uv-lock: # Generate a uv.lock file for reproducible Python builds
    @echo "Generating uv.lock..."
    docker compose run --rm cognitive-service-py uv lock

# Database management recipes
reset-db:
    @echo "Resetting database and dlt state..."
    @docker compose exec postgres psql -U chessmate_user -d chessmate_db -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS ai CASCADE;"
    @echo "✅ Database schema dropped and recreated."
    @just db-install-pgai
    @just vectorize
    @echo "✅ Existing vectorizer dropped."
    @rm -rf backend/cognitive_service/.dlt
    @echo "✅ dlt state removed."
    @rm -rf backend/cognitive_service/dbt_project/logs
    @rm -rf backend/cognitive_service/dbt_project/target
    @echo "✅ dbt artifacts cleaned."
    @echo "✅ Reset complete."

db-install-pgai:
    @echo "Installing pgai functions into the database..."
    @docker compose run --rm --entrypoint "python -m pgai install -d postgres://chessmate_user:chessmate_password@postgres:5432/chessmate_db" vectorizer-worker
    @echo "✅ pgai functions installed."

db-clean:
    @echo "DEPRECATED: Use db-nuke or db-clean-staged instead."
    @echo "Cleaning database..."
    @rm -f backend/cognitive_service/data/chessmate.db
    @echo "Database cleaned."

db-nuke:
    @echo "Dropping schema and recreating database..."
    @docker compose exec -T -e PGPASSWORD=chessmate_password postgres psql -U postgresml -d postgresml -h localhost -c "DROP SCHEMA IF EXISTS staged_pgn_data CASCADE; CREATE SCHEMA staged_pgn_data;"
    @echo "✅ Database schema reset."

db-clean-staged:
    @echo "Cleaning staged PGN data..."
    @docker compose exec -T -e PGPASSWORD=chessmate_password postgres psql -U postgresml -d postgresml -h localhost -c "TRUNCATE TABLE staged_pgn_data.games_resource, staged_pgn_data._dlt_loads, staged_pgn_data._dlt_version, staged_pgn_data._dlt_pipeline_state CASCADE;"
    @echo "✅ Staged PGN data cleaned."

db-clean-prepared:
    @echo "Cleaning prepared chess knowledge data..."
    @docker compose exec -T -e PGPASSWORD=chessmate_password postgres psql -U postgresml -d postgresml -h localhost -c "TRUNCATE TABLE prepared_chess_knowledge CASCADE;"
    @echo "✅ Prepared chess knowledge data cleaned."

ensure-services-ready:
    @echo "Ensuring all dependent services are running and healthy..."
    @docker compose up -d postgres redis redis-monitor ollama genai-toolbox vectorizer-worker traefik backend-node
    @echo "Waiting for database to become healthy..."
    @while ! docker compose ps postgres | grep -q '(healthy)'; do \
        sleep 1; \
    done;
    @echo "✅ All dependent services are ready."

fix-permissions:
    @echo "Fixing directory permissions on the host..."
    @mkdir -p backend/cognitive_service/logs
    @mkdir -p backend/cognitive_service/dbt_project/logs
    @mkdir -p backend/cognitive_service/dbt_project/target
    @sudo chmod -R 777 backend/cognitive_service/logs
    @sudo chmod -R 777 backend/cognitive_service/dbt_project/logs
    @sudo chmod -R 777 backend/cognitive_service/dbt_project/target
    @echo "✅ Permissions fixed."

# Run the full ELT pipeline (ingest + dbt transform + vectorizer)
run-full-pipeline *flags:
    @echo "Running full, observable ELT pipeline..."
    @echo "Stopping worker to prevent race conditions..."
    @docker compose stop vectorizer-worker
    @just reset-db
    @just fix-permissions
    @just dlt-ingest {{flags}}
    @just dbt-transform
    @just vectorize
    @echo "Starting worker to process new vectorizer job..."
    @docker compose up -d vectorizer-worker
    @echo "✅ Full pipeline complete."

dlt-ingest *flags:
    @echo "Running DLT ingestion pipeline..."
    docker compose build cognitive-service-py
    docker compose run --rm cognitive-service-py python scripts/dlt_ingest_only.py {{flags}}

dbt-transform:
    @echo "Running dbt transformations..."
    docker compose build cognitive-service-py
    docker compose run --rm cognitive-service-tools sh -c "cd dbt_project && dbt deps && dbt run --profiles-dir ."

vectorize:
    @echo "Creating vectorizer..."
    docker compose build cognitive-service-py
    docker compose run --rm cognitive-service-tools python scripts/create_vectorizer.py

validate-ingestion:
    @echo "Validating ingestion step..."
    @docker compose exec postgres psql -U chessmate_user -d chessmate_db -c "SELECT COUNT(*) FROM staged_pgn_data.games_resource;"

validate-transformation:
    @echo "Validating transformation step..."
    @docker compose exec postgres psql -U chessmate_user -d chessmate_db -c "\d prepared_chess_knowledge"


# Send a test event to the backend
test-event:
    @echo "=== Enhanced WebSocket Test Event ==="
    @echo "Timestamp: $(date)"
    @echo "Testing WebSocket connection to ws://localhost:8080"
    @echo ""
    @echo "Sending move: e4 (King's pawn opening)"
    @echo "Expected flow: WebSocket -> Node.js -> Redis -> Python Service"
    @echo ""
    @echo "Sending test event..."
    @echo '{"type":"move","move":"e4"}' | websocat -1 ws://localhost:8080
    @echo ""
    @echo "✅ Test event sent! Check logs below for message flow..."

# Send multiple test moves to simulate a game
test-game-sequence:
    @echo "=== Testing Game Sequence ==="
    @echo "Sending opening moves: e4, e5, Nf3"
    @echo ""
    @echo "Move 1: e4"
    @echo '{"type":"move","move":"e4"}' | wscat -c ws://localhost:8080 -w 2
    @sleep 1
    @echo ""
    @echo "Move 2: e5"  
    @echo '{"type":"move","move":"e5"}' | wscat -c ws://localhost:8080 -w 2
    @sleep 1
    @echo ""
    @echo "Move 3: Nf3"
    @echo '{"type":"move","move":"Nf3"}' | wscat -c ws://localhost:8080 -w 2
    @echo ""
    @echo "✅ Game sequence complete!"

# Test with an illegal move to verify error handling
test-illegal-move:
    @echo "=== Testing Illegal Move Handling ==="
    @echo "Sending illegal move: xyz (should trigger error)"
    @echo '{"type":"move","move":"xyz"}' | wscat -c ws://localhost:8080 -w 3
    @echo ""
    @echo "✅ Illegal move test sent! Should see error in logs..."


# 5. Monitor logs during test
test-with-monitoring:
    #!/usr/bin/env bash
    set -e # Exit immediately if a command exits with a non-zero status.

    echo "=== WebSocket Test with Live Log Monitoring ==="
    
    # Start log monitoring in background
    LOG_FILE=$(mktemp)
    docker compose logs -f --tail=5 backend-node cognitive-service-py > "$LOG_FILE" &
    LOG_PID=$!
    
    # Ensure log monitor is killed on exit
    trap 'kill $LOG_PID 2>/dev/null; rm -f "$LOG_FILE"' EXIT
    
    echo "��� Starting log monitoring (PID: $LOG_PID)..."
    sleep 2 # Give logs a moment to start
    
    echo "🚀 Running websocat test..."
    echo '{"type":"move","move":"e4"}' | websocat --exit-on-eof ws://localhost:8080
    
    echo "⏳ Waiting for message processing..."
    
    TIMEOUT=60
    SUCCESS_MSG="Published coaching message"
    
    for ((i=0; i<TIMEOUT; i++)); do
        if grep -q "$SUCCESS_MSG" "$LOG_FILE"; then
            echo "✅ Success message found in logs."
            break
        fi
        sleep 1
    done
    
    if ! grep -q "$SUCCESS_MSG" "$LOG_FILE"; then
        echo "❌ Test failed: Did not find success message '$SUCCESS_MSG' within $TIMEOUT seconds."
        exit 1
    fi
    
    echo "🛑 Stopping log monitor..."
    # The trap will handle cleanup


# 6. Health check and diagnostics
diagnose-websocket:
    @echo "=== WebSocket Server Diagnostics ==="
    @echo ""
    @echo "🔍 Checking Docker services..."
    @docker compose ps
    @echo ""
    @echo "🔍 Checking port 8080..."
    @ss -tlnp | grep :8080 || echo "Port 8080 not listening"
    @echo ""
    @echo "🔍 Testing raw TCP connection..."
    @timeout 3 telnet localhost 8080 </dev/null || echo "TCP connection test complete"
    @echo ""
    @echo "🔍 Testing HTTP upgrade..."
    @curl -s -I -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:8080/ | head -5
    @echo ""
    @echo "✅ Diagnostics complete"

# Alternative test using curl for basic connectivity
test-http-check:
    @echo "=== HTTP Server Check ==="
    @echo "Checking if port 8080 responds to HTTP..."
    @curl -v http://localhost:8080 2>&1 | head -10 || echo "HTTP check complete"

# Verify all services are running before testing
test-verify-services:
    @echo "=== Service Health Check ==="
    @echo "Checking if all services are running..."
    @docker compose ps
    @echo ""
    @echo "Checking WebSocket port 8080..."
    @nc -z localhost 8080 && echo "✅ WebSocket server is accessible" || echo "❌ WebSocket server not accessible"
    @echo ""
    @echo "Checking Redis port 6379..."
    @nc -z localhost 6379 && echo "✅ Redis is accessible" || echo "❌ Redis not accessible"


# Start the GSC FastMCP server in the background
gsc-up:
    @echo "Starting GSC FastMCP server..."
    cd ../305-001-ref-py-mcp-gsc/gemini-llm-gsc/gsc && uvicorn fast_mcp_server:mcp.http_app --port 8125 &
    @echo "Waiting for GSC FastMCP server to be healthy..."
    @for i in {1..10}; do \
        if curl -s http://localhost:8125/health | grep -q "OK"; then \
            echo "GSC FastMCP server is healthy."; \
            break; \
        fi; \
        sleep 1; \
    done
    @echo "GSC FastMCP server started on port 8125."


# Stop the GSC FastMCP server
gsc-down:
    @echo "Stopping GSC FastMCP server..."
    - pkill -f "uvicorn fast_mcp_server:mcp.http_app --port 8125" || true
    @echo "GSC FastMCP server stopped."

# Full diagnostic test sequence
test-full-diagnostic: test-verify-services test-event test-illegal-move
    @echo ""
    @echo "=== Full Diagnostic Complete ==="
    @echo "✅ All tests executed. Check logs for results."

# Monitor only Python service logs during test
test-python-logs:
    #!/usr/bin/env bash
    echo "=== Python Service Log Monitor ==="
    echo "Monitoring cognitive-service-py logs while sending test..."
    echo ""
    
    # Start Python log monitoring
    docker compose logs -f --tail=5 cognitive-service-py &
    LOG_PID=$!
    
    sleep 2
    
    echo "Sending test move..."
    echo '{"type":"move","move":"e4"}' | wscat -c ws://localhost:8080 -w 3
    
    echo ""
    echo "Waiting for Python service response..."
    sleep 8
    
    kill $LOG_PID 2>/dev/null
    echo ""
    echo "✅ Python log monitoring complete"

# Monitor only Node.js service logs during test  
test-nodejs-logs:
    #!/usr/bin/env bash
    echo "=== Node.js Service Log Monitor ==="
    echo "Monitoring backend-node logs while sending test..."
    echo ""
    
    # Start Node.js log monitoring
    docker compose logs -f --tail=5 backend-node &
    LOG_PID=$!
    
    sleep 2
    
    echo "Sending test move..."
    echo '{"type":"move","move":"e4"}' | wscat -c ws://localhost:8080 -w 3
    
    echo ""
    echo "Waiting for Node.js processing..."
    sleep 5
    
    kill $LOG_PID 2>/dev/null
    echo ""
    @echo "✅ Node.js log monitoring complete"

# Simple telnet test to see if port is really accepting connections
test-port:
    @echo "Testing raw connection to port 8080..."
    @timeout 3 telnet localhost 8080 || echo "Connection test complete"

# Test if WebSocket server is properly bound
test-server-info:
    @echo "Checking what's listening on port 8080..."
    @lsof -i :8080 || netstat -an | grep 8080

# Scan the cognitive service image for vulnerabilities using Trivy
scan-vulnerabilities:
    @echo "Scanning cognitive-service-py image for vulnerabilities..."
    @docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
        aquasec/trivy image --severity HIGH,CRITICAL 035-001-001-vylabs-target-chessmate-cognitive-service-py

# List all available Justfile recipes
list:
    @just --list

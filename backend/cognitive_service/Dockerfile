# --- Builder Stage ---
# Use a full-featured image for building dependencies
FROM python:3.11-slim-bullseye AS builder

# Create a virtual environment
ENV VENV_PATH=/opt/venv
RUN python -m venv $VENV_PATH
ENV PATH="$VENV_PATH/bin:$PATH"

# 1. Install system dependencies first (cached unless system packages change)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgeos-dev

# 2. Install uv (cached unless this step changes)
RUN pip install --no-cache-dir uv

# 3. Copy and install adk-python (cached unless adk-python changes)
# COPY deps/adk-python /tmp/adk-python
# RUN pip install --no-cache-dir /tmp/adk-python && rm -rf /tmp/adk-python

# 4. Install build-time dependencies for packages that need them
RUN pip install --no-cache-dir wheel setuptools

# 5. Copy requirements and install with uv optimizations (cached unless requirements.txt changes)
COPY requirements.txt .
ENV UV_CACHE_DIR=/tmp/uv-cache
RUN uv pip install --no-cache-dir -r requirements.txt --compile-bytecode --no-build-isolation

# 6. Install dev tools separately (cached unless this step changes)
RUN uv pip install --no-cache-dir mypy ruff pytest pytest-asyncio --compile-bytecode

# 7. Clean up build dependencies at the end of the builder stage
RUN apt-get purge -y --auto-remove build-essential && rm -rf /var/lib/apt/lists/*

# --- Base Stage ---
# A common base for both production and tools, containing the venv and runtime dependencies
FROM python:3.11-slim-bullseye AS base

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgeos-c1v5 \
    ca-certificates \
    stockfish \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv

ARG USER_ID=1000
ARG GROUP_ID=1000

RUN groupadd -g ${GROUP_ID} appgroup && \
    useradd -u ${USER_ID} -g appgroup -m -s /bin/bash appuser

# Copy with correct ownership
COPY --chown=appuser:appgroup . .

# Create directories that the appuser needs to write to.
# In production, these will be owned by appuser. In dev, they'll be mounted over.
RUN mkdir -p /usr/src/app/logs /usr/src/app/dbt_project/logs /usr/src/app/dbt_project/target /usr/src/app/.ruff_cache
RUN chown -R appuser:appgroup /usr/src/app/logs /usr/src/app/dbt_project /usr/src/app/.ruff_cache

USER appuser
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH="/usr/src/app"

# --- Production Stage ---
# The final image for the long-running cognitive service
FROM base AS production

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import redis; r = redis.Redis(host='redis', port=6379); r.ping()"

CMD ["python", "-u", "-m", "app.main"]

# --- Tools Stage ---
# The final image for running one-off tools like dbt
FROM base AS tools

# Install networking and database client tools for debugging
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    iputils-ping \
    telnet \
    git \
    dnsutils \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*
USER appuser

# No CMD or HEALTHCHECK needed for this ephemeral container
CMD ["/bin/bash"]

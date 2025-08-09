# ChessMate Quick Start Guide

Welcome to ChessMate! This guide will walk you through setting up and running the ChessMate platform on your local machine. In just a few steps, you'll have a unified, container-based development environment up and running, ready for you to explore and contribute.

Let's get started!

### Step 1: Your Development Environment

Our goal is to provide a consistent and reliable development experience. To achieve this, the entire ChessMate environment is orchestrated using Docker containers.

**Prerequisites:**

Before you begin, please ensure you have the following installed on your Ubuntu 24.04 machine:

*   A working Docker setup with the `docker compose` extension.
*   The `just` command runner utility. You can install it easily with:
    ```bash
    sudo apt install just
    ```

### Step 2: Configuration

First, we need to set up your local environment variables. This ensures that the services can communicate with each other and with your host machine.

1.  **Create the root `.env` file:**
    ```bash
    cp .example.env .env
    ```
    Now, open the new `.env` file and set the `USER_ID` and `GROUP_ID` to your system's user and group IDs.

2.  **Create the cognitive service `.env` file:**
    ```bash
    cp backend/cognitive_service/.env.example backend/cognitive_service/.env
    ```
    Next, open `backend/cognitive_service/.env` and add your `GOOGLE_API_KEY`. The other variables are pre-configured for the Docker environment.

> **💡 High-Value Note:**
> The `GOOGLE_API_KEY` is the crucial change that will allow the cognitive service to authenticate with the Gemini models.

### Step 3: Launch the Core Infrastructure

With the configuration in place, it's time to bring the core services to life. This command will start the database, event bus, and other essential background services.

```bash
just ensure-services-ready
```

You'll see a series of messages as Docker builds and starts the containers. Once you see the `✅ All dependent services are ready.` message, you're good to go!

You can verify that everything is running smoothly at any time with:
```bash
just status
```

### Step 4: Prepare the Chess Knowledge Store

Now that our infrastructure is running, we need to feed our AI its chess knowledge. This is a three-stage pipeline that processes a dataset of chess games and prepares it for our cognitive service.

1.  **Download the Dataset:**
    For this guide, we'll use a sample dataset from Lichess. Please download it and place it in the `backend/cognitive_service/data` directory.
    *   **Link:** [https://database.lichess.org/standard/lichess_db_standard_rated_2014-07.pgn.zst](https://database.lichess.org/standard/lichess_db_standard_rated_2014-07.pgn.zst)
    *   After downloading and decompressing, your directory should look like this:
        ```
        backend/cognitive_service/data/
        └── lichess_db_standard_rated_2014-07.pgn
        ```

2.  **Run the Ingestion Pipeline:**
    This command will kick off the automated pipeline to stage, clean, and vectorize the chess data.
    ```bash
    just run-full-pipeline --sample 1
    ```
    > **💡 A Note on `--sample 1`:**
    > For this quick start, we're only indexing 10% of the data to speed things up. You can run the command without this flag to process the entire dataset.

    The vectorization process uses the Ollama service running on your CPU, so it may take some time to complete depending on your machine's resources. Once it's finished, you can verify that the knowledge and embeddings tables have been populated:
    ```bash
    docker compose exec postgres psql -U chessmate_user -d chessmate_db -c "SELECT (SELECT COUNT(*) FROM prepared_chess_knowledge) as knowledge_count, (SELECT COUNT(*) FROM prepared_chess_knowledge_embeddings_store) as embeddings_count;"
    ```
    You should see a matching count for both `knowledge_count` and `embeddings_count`.

### Step 5: Start the Brains and the Beauty

With the knowledge base ready, we can now start the two main application services: the AI cognitive service and the frontend web app.

1.  **Start the Cognitive Service:**
    Open a new terminal and run:
    ```bash
    docker compose build cognitive-service-py && docker compose run --rm cognitive-service-py
    ```
    You'll see the service initialize and start listening for messages from the event bus.

2.  **Start the Frontend Web App:**
    In another new terminal, run:
    ```bash
    docker compose build frontend-dev-env2 && docker compose run --rm -p 3000:3000 frontend-dev-env2
    ```
    This will start the Vite development server.

### Step 6: See ChessMate in Action!

Congratulations, the entire ChessMate environment is now running!

*   **Open your browser** and navigate to [http://localhost:3000/](http://localhost:3000/).
*   **Make a move** on the chessboard.

You can watch the system work in real-time by monitoring the Redis message bus:
```bash
just logs-service redis-monitor
```

You'll see messages for both legal and illegal moves as the frontend and cognitive service communicate.

> **A Note on the Current State:**  
> ChessMate is currently in its early development phase. You may experience some delays in AI responses, as our system relies on both local semantic search (using Ollama on your CPU) and the external `"gemini-2.5-pro"` provider. We’re actively working to enhance performance and introduce new features.

Thank you for being a part of the ChessMate journey!

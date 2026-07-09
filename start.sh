#!/bin/bash
# Do not use set -e so that if one background worker fails, it doesn't kill the whole script

PORT="${PORT:-10000}"

echo "Starting Orchestrator..."
python -m app.orchestrator &

echo "Starting Workers..."
python -m app.workers.inapp_worker &
python -m app.workers.push_worker &
python -m app.workers.email_worker &
python -m app.workers.retry_worker &
python -m app.workers.dlq_worker &

echo "Starting FastAPI server on port $PORT..."
# Run the web server in the foreground using exec so it becomes the main process
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT

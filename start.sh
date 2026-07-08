#!/bin/bash
set -e

echo "Starting FastAPI server..."
# Start the web server in the background
uvicorn app.main:app --host 0.0.0.0 --port $PORT &

echo "Starting Orchestrator..."
python -m app.orchestrator &

echo "Starting Workers..."
python -m app.workers.inapp_worker &
python -m app.workers.push_worker &
python -m app.workers.email_worker &
python -m app.workers.retry_worker &
python -m app.workers.dlq_worker &

# Wait for all background processes
wait

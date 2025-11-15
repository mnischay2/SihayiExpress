#!/bin/bash

# This script terminates the background processes started by the run_setup.sh script.

echo "Terminating the backend and frontend processes..."

# Find and kill the Node.js backend process
# We use pkill -f to match against the full command line string to be more specific.
BACKEND_PID=$(pgrep -f "node backend/app.js")
if [ -n "$BACKEND_PID" ]; then
    kill $BACKEND_PID
    echo "Backend process (PID: $BACKEND_PID) terminated."
else
    echo "Backend process not found."
fi

# Find and kill the Python frontend process
FRONTEND_PID=$(pgrep -f "python3 start_frontend.py")
if [ -n "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID
    echo "Frontend process (PID: $FRONTEND_PID) terminated."
else
    echo "Frontend process not found."
fi

echo "All processes terminated."

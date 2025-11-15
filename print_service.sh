#!/bin/bash

# Start backend
(
  cd ~/home/github/SihayiExpress && npm start
) &

# Start frontend
(
  cd ~/home/github/SihayiExpress/frontend && python3 start_frontend.py
) &

# Wait for both to finish
wait


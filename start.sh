#!/bin/bash

cd "$(dirname "$0")"

# Install deps if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Check for API key
if grep -q "your_api_key_here" .env 2>/dev/null; then
  echo ""
  echo "⚠️  Add your Anthropic API key to .env before starting."
  echo "   Get one at: https://console.anthropic.com"
  echo ""
fi

npm start

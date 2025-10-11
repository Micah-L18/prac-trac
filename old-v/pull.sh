#!/bin/bash

# Script to pull files from remote server
# Replace with your actual username and specify the files/directories you want to pull

REMOTE_HOST="45.26.230.240"
REMOTE_USER="micah"
REMOTE_PATH="prac-trac-demo"
LOCAL_PATH="./"

# Create local directory if it doesn't exist
mkdir -p "$LOCAL_PATH"

# Pull files using scp (recursive)
rsync -avz --exclude='node_modules' --exclude='.git' "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/" "$LOCAL_PATH/"

# Alternative using rsync with exclusions (recommended)
# rsync -avz --exclude='node_modules' --exclude='.git' "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/" "$LOCAL_PATH/"

echo "File transfer completed"
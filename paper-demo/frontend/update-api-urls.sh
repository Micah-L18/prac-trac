#!/bin/bash

# Script to update all localhost:3001 URLs to use the API configuration
# Run this from the frontend directory

echo "🔧 Updating API URLs to use dynamic configuration..."

# Find all JavaScript files that contain localhost:3001
FILES=$(grep -r -l "localhost:3001" src/ --include="*.js" 2>/dev/null)

for file in $FILES; do
    echo "📝 Updating $file..."
    
    # Add import if not already present and file doesn't already import from config/api
    if ! grep -q "from.*config/api" "$file"; then
        # Find the last import statement line number
        LAST_IMPORT_LINE=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)
        
        if [ ! -z "$LAST_IMPORT_LINE" ]; then
            # Insert the API import after the last import
            sed -i '' "${LAST_IMPORT_LINE}a\\
import { API_BASE_URL } from '../config/api';
" "$file"
            echo "   ✅ Added API import to $file"
        fi
    fi
    
    # Replace all localhost:3001 URLs with API_BASE_URL
    sed -i '' 's|http://localhost:3001|\${API_BASE_URL}|g' "$file"
    
    echo "   ✅ Updated API URLs in $file"
done

echo "🎉 All files updated! Mobile Safari should now be able to connect."
echo "📱 Don't forget to restart your backend server and check your IP address."
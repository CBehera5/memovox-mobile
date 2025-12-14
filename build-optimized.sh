#!/bin/bash

# Build Size Comparison Script
echo "🔨 Building optimized APK..."
echo ""

# Build with new optimizations
echo "Starting EAS build with optimizations..."
eas build --platform android --profile production-apk --non-interactive

echo ""
echo "✅ Build submitted! Check the dashboard:"
echo "https://expo.dev/accounts/chinuchinu8/projects/memovox/builds"
echo ""
echo "📊 To compare sizes:"
echo "eas build:list --platform android --limit 2"

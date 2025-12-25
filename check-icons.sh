#!/bin/bash

# Memovox Icon Setup Script
# This script helps you set up your app icons

echo "🎨 Memovox Icon Setup"
echo "===================="
echo ""

# Check if assets directory exists
if [ ! -d "assets" ]; then
    echo "❌ Error: assets directory not found!"
    echo "Please run this script from your project root."
    exit 1
fi

echo "📁 Current assets directory:"
ls -lh assets/
echo ""

# Check for required files
echo "📋 Checking for required files:"
echo ""

if [ -f "assets/icon.png" ]; then
    SIZE=$(identify -format "%wx%h" assets/icon.png 2>/dev/null || echo "unknown")
    echo "✅ icon.png found (${SIZE})"
else
    echo "❌ icon.png NOT found"
    echo "   Required: 1024x1024px PNG"
    echo "   Save your Memovox logo as: assets/icon.png"
fi

if [ -f "assets/adaptive-icon.png" ]; then
    SIZE=$(identify -format "%wx%h" assets/adaptive-icon.png 2>/dev/null || echo "unknown")
    echo "✅ adaptive-icon.png found (${SIZE})"
else
    echo "❌ adaptive-icon.png NOT found"
    echo "   Required: 1024x1024px PNG"
fi

if [ -f "assets/splash.png" ]; then
    SIZE=$(identify -format "%wx%h" assets/splash.png 2>/dev/null || echo "unknown")
    echo "✅ splash.png found (${SIZE})"
else
    echo "❌ splash.png NOT found"
    echo "   Required: 1242x2436px PNG or higher"
    echo "   Create a splash screen with your logo centered"
fi

echo ""
echo "===================="
echo ""

if [ ! -f "assets/icon.png" ] || [ ! -f "assets/splash.png" ]; then
    echo "⚠️  ACTION REQUIRED:"
    echo ""
    echo "1. Save your Memovox logo as: assets/icon.png (1024x1024px)"
    echo "2. Create a splash screen as: assets/splash.png (1242x2436px)"
    echo ""
    echo "See SETUP_APP_ICON.md for detailed instructions."
    echo ""
    exit 1
else
    echo "✅ All icon files are present!"
    echo ""
    echo "🚀 Next steps:"
    echo "1. Clear cache: expo start -c"
    echo "2. Or build: eas build --platform android"
    echo ""
fi

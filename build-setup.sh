#!/bin/bash

# MemoVox Mobile - APK Build Setup Script
# Run this script to set up and build your APK

set -e  # Exit on error

echo "🚀 MemoVox Mobile - APK Build Setup"
echo "===================================="
echo ""

# Step 1: Check Node.js
echo "✓ Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi
echo "   Node.js version: $(node --version)"
echo ""

# Step 2: Check npm
echo "✓ Checking npm installation..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi
echo "   npm version: $(npm --version)"
echo ""

# Step 3: Install dependencies
echo "📦 Installing project dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Step 4: Install EAS CLI
echo "📦 Installing EAS CLI..."
if ! command -v eas &> /dev/null; then
    npm install -g eas-cli
    echo "✓ EAS CLI installed"
else
    echo "✓ EAS CLI already installed: $(eas --version)"
fi
echo ""

# Step 5: Login prompt
echo "🔐 Next step: Login to Expo"
echo "   Run: eas login"
echo ""

# Step 6: Configure EAS
echo "⚙️  Next step: Configure EAS Build"
echo "   Run: eas build:configure"
echo ""

# Step 7: Build instructions
echo "🏗️  Build APK for testing:"
echo ""
echo "   Option 1 - Preview Build (recommended for testing):"
echo "   $ eas build -p android --profile preview"
echo ""
echo "   Option 2 - Development Build (with dev tools):"
echo "   $ eas build -p android --profile development"
echo ""
echo "   Option 3 - Production Build:"
echo "   $ eas build -p android --profile production"
echo ""

# Step 8: Success message
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Run: eas login"
echo "   2. Run: eas build:configure"
echo "   3. Run: eas build -p android --profile preview"
echo "   4. Wait 15-20 minutes for build"
echo "   5. Download APK from the provided link"
echo "   6. Install on your Android device"
echo ""
echo "📚 Full guide: See BUILD_APK_GUIDE.md"
echo ""

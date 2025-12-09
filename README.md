# Memovox - AI-Powered Voice Memo App

A mobile application built with React Native and Expo that uses AI to transform voice memos into actionable insights with beautiful 3D animations and effects.

## 🌟 Features

- **Voice Recording**: Record voice memos with high-quality audio capture
- **AI Processing**: Powered by Groq API for fast AI processing
- **Chat Interface**: Discuss your memos with an AI assistant
- **3D Animations**: Beautiful animated action buttons with:
  - Scale animations
  - 360° flip animations
  - Glow effects
  - Float animations
- **Instant Insights**: Generate insights from your memos
- **Audio Chat**: Voice-based conversation with the AI
- **Cross-Platform**: Runs on iOS, Android, and Web

## 🛠️ Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router v4.0.9
- **State Management**: React Hooks
- **Backend**: Supabase
- **AI**: Groq SDK
- **Storage**: Async Storage & Supabase Database
- **Audio**: Expo AV & Expo Speech
- **Animations**: React Native Animated API

## 📋 Prerequisites

- Node.js v16 or higher
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode and iPhone (or simulator)
- Android: Android SDK and Android device (or emulator)

## ⚙️ Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd memovox-mobile
```

2. **Install dependencies**
```bash
npm install --legacy-peer-deps
```

3. **Environment Setup**
Create a `.env.local` file in the root directory:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_APP_URL=your_app_url
```

4. **Configure Groq API**
Update `src/services/AIService.ts` with your Groq API key

## 🚀 Getting Started

### Development Server
```bash
npm start
```

### iOS Testing
```bash
npm run ios
# or while Metro is running, press 'i'
```

### Android Testing
```bash
npm run android
# or while Metro is running, press 'a'
```

### Web Testing
```bash
npm run web
```

## 📁 Project Structure

```
memovox-mobile/
├── app/                      # Navigation and layout
│   ├── _layout.tsx          # Root layout
│   ├── splash.tsx           # Splash screen
│   ├── index.tsx            # Home screen
│   ├── (auth)/              # Auth routes
│   │   ├── login.tsx
│   │   └── signup.tsx
│   └── (tabs)/              # Main app tabs
│       ├── index.tsx        # Notes/Memos
│       ├── chat.tsx         # Chat interface
│       └── profile.tsx      # User profile
├── src/
│   ├── components/          # Reusable components
│   │   ├── AnimatedActionButton.tsx
│   │   ├── FlippableCard.tsx
│   │   └── ...
│   ├── services/            # Business logic
│   │   ├── AIService.ts
│   │   ├── ChatService.ts
│   │   ├── StorageService.ts
│   │   └── ...
│   ├── types/               # TypeScript types
│   ├── hooks/               # Custom hooks
│   ├── constants/           # App constants
│   └── utils/               # Utility functions
├── assets/                  # Images, fonts, etc.
├── app.json                 # Expo configuration
├── tsconfig.json            # TypeScript config
├── babel.config.js          # Babel configuration
└── package.json             # Dependencies

```

## 🎨 3D Animation Components

### AnimatedActionButton
Creates beautiful 3D animated buttons with multiple effects:
- Tap to scale and flip
- Glow effect on press
- Smooth transitions
- Tooltip labels

**Usage:**
```tsx
<AnimatedActionButton
  onPress={() => handleAction()}
  icon="💡"
  label="Get Insight"
/>
```

### FlippableCard
Interactive card that flips with 3D perspective effect

### PulsingRingButton
Button with pulsing ring animation for recording

## 🔐 Authentication

The app uses Supabase for authentication:
- Email/Password signup
- Session management
- Secure token storage

## 🗄️ Database Schema

### Tables
- `memos` - User voice memos
- `insights` - Generated insights
- `chat_messages` - Chat history
- `users` - User profiles

## 📱 Supported Platforms

| Platform | Status | Version |
|----------|--------|---------|
| iOS | ✅ Active | 14+ |
| Android | ✅ Active | 8+ |
| Web | ✅ Beta | Latest |

## 🐛 Troubleshooting

### Metro Bundler Issues
```bash
npm start -- --reset-cache
```

### Module Not Found
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Port Already in Use
```bash
# Find and kill process on port 8081
lsof -i :8081
kill -9 <PID>
```

## 📝 Version Requirements

- expo: ~54.0.0
- expo-router: ~4.0.9
- react-native: 0.76.5
- react: 18.3.1

## 🚀 Deployment

### EAS Build (Expo's Build Service)
```bash
npm install -g eas-cli
eas login
eas build --platform ios
eas build --platform android
```

### Manual Build
See `DEVICE_SETUP_GUIDE.md` for detailed build instructions

## 📚 Documentation

- `DEVICE_SETUP_GUIDE.md` - Complete device setup instructions
- `DEVICE_TESTING_GUIDE.md` - Testing procedures and checklist
- `DEVICE_TESTING_SUMMARY.md` - Quick start guide

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

Chinmay Behera

## 🙏 Acknowledgments

- [Expo](https://expo.dev/) for the amazing React Native framework
- [Groq](https://groq.com/) for fast AI processing
- [Supabase](https://supabase.com/) for backend services
- The React Native community

## 📞 Support

For issues and questions:
1. Check existing GitHub issues
2. Create a new issue with detailed description
3. Include error logs and steps to reproduce

---

**Happy coding! 🚀**

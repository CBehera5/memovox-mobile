# Adding Text-to-Speech (TTS) to Audio Chat

## 📢 Current State

The `ChatService.generateSpeech()` method exists as a **placeholder**. It currently returns an empty string. This guide shows how to implement actual text-to-speech so the AI can speak its responses aloud.

## 🎯 TTS Integration Options

### **Option 1: Expo Speech (Simplest)**
**Pros:** Built-in, no API key needed, cross-platform
**Cons:** Limited voice quality and options
**Setup time:** 5 minutes

```bash
npx expo install expo-speech
```

**Implementation:**
```typescript
import * as Speech from 'expo-speech';

async generateSpeech(text: string): Promise<string> {
  try {
    // Stop any ongoing speech
    await Speech.stop();
    
    // Speak the text
    await Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.9,
    });
    
    return text;
  } catch (error) {
    console.error('TTS error:', error);
    return '';
  }
}
```

### **Option 2: Google Cloud Text-to-Speech (High Quality)**
**Pros:** Excellent voice quality, many language options
**Cons:** Requires API key, costs money ($0-4/month for typical use)
**Setup time:** 15 minutes

```bash
npm install @google-cloud/text-to-speech
```

**Implementation:**
```typescript
import TextToSpeech from '@google-cloud/text-to-speech';

async generateSpeech(text: string): Promise<string> {
  try {
    const client = new TextToSpeech.TextToSpeechClient({
      apiKey: process.env.GOOGLE_TTS_API_KEY,
    });

    const request = {
      input: { text },
      voice: {
        languageCode: 'en-US',
        name: 'en-US-Neural2-C',
      },
      audioConfig: {
        audioEncoding: 'LINEAR16',
      },
    };

    const [response] = await client.synthesizeSpeech(request);
    const audioUri = await this.saveAudioFile(response.audioContent);
    
    // Play the audio
    await AudioService.playAudio(audioUri);
    
    return audioUri;
  } catch (error) {
    console.error('TTS error:', error);
    return '';
  }
}
```

### **Option 3: ElevenLabs (Best Voice Quality)**
**Pros:** Most natural-sounding voices, premium quality
**Cons:** Requires API key, higher cost ($5-99/month)
**Setup time:** 15 minutes

```bash
npm install elevenlabs
```

**Implementation:**
```typescript
import { ElevenLabsClient, VoiceSettings } from 'elevenlabs';

async generateSpeech(text: string): Promise<string> {
  try {
    const client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    const audio = await client.generate({
      voice: 'Bella', // or other voice names
      text: text,
      model_id: 'eleven_monolingual_v1',
    });

    const audioUri = await this.saveAudioFile(audio);
    
    // Play the audio
    await AudioService.playAudio(audioUri);
    
    return audioUri;
  } catch (error) {
    console.error('TTS error:', error);
    return '';
  }
}
```

### **Option 4: Azure Speech Services**
**Pros:** Good quality, integration with other Azure services
**Cons:** Requires API key, moderate cost
**Setup time:** 20 minutes

## 🚀 Quick Implementation (Expo Speech - Recommended to Start)

### **Step 1: Install**
```bash
cd /Users/chinmaybehera/memovox-rel1/memovox-mobile
npx expo install expo-speech
```

### **Step 2: Update ChatService.ts**

Find this section in `src/services/ChatService.ts`:

```typescript
async generateSpeech(text: string): Promise<string> {
  // TODO: Implement TTS
  return '';
}
```

Replace with:

```typescript
private speechModule: any = null;

async initializeSpeech() {
  try {
    // This will be available at runtime
    const Speech = require('expo-speech').default;
    this.speechModule = Speech;
  } catch (error) {
    console.warn('Speech module not available');
  }
}

async generateSpeech(text: string): Promise<string> {
  try {
    if (!this.speechModule) {
      await this.initializeSpeech();
    }

    if (!this.speechModule) {
      console.warn('Speech module not available');
      return '';
    }

    // Stop any ongoing speech
    await this.speechModule.stop();

    // Speak the text
    await new Promise((resolve, reject) => {
      this.speechModule.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9,
        onDone: resolve,
        onError: reject,
      });
    });

    return text;
  } catch (error) {
    console.error('TTS error:', error);
    return '';
  }
}
```

### **Step 3: Update Chat Screen to Play Responses**

In `app/(tabs)/chat.tsx`, find the `sendTextMessage` function:

```typescript
const sendTextMessage = async () => {
  if (!textInput.trim() || !currentSession) return;

  const userMessage = textInput;
  setTextInput('');
  
  try {
    setIsLoading(true);
    const response = await ChatService.sendMessage(userMessage);
    
    if (response) {
      const updatedSession = await ChatService.getCurrentSession();
      if (updatedSession) {
        setCurrentSession(updatedSession);
        setMessages(updatedSession.messages);
        
        // NEW: Play AI response as speech
        if (response.role === 'assistant') {
          await ChatService.generateSpeech(response.content);
        }
      }
    }
  } catch (error) {
    console.error('Error sending message:', error);
    Alert.alert('Error', 'Failed to send message. Please try again.');
  } finally {
    setIsLoading(false);
  }
};
```

### **Step 4: Update Voice Recording Handler**

In `app/(tabs)/chat.tsx`, find the `stopVoiceRecording` function and add:

```typescript
const stopVoiceRecording = async () => {
  try {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    const audioUri = await AudioService.stopRecording();
    setIsRecording(false);
    setRecordingTime(0);

    if (!audioUri || !currentSession) return;

    setIsLoading(true);
    const transcription = await ChatService.transcribeAudio(audioUri);
    
    if (transcription) {
      const response = await ChatService.sendMessage(transcription, audioUri);
      if (response) {
        const updatedSession = await ChatService.getCurrentSession();
        if (updatedSession) {
          setCurrentSession(updatedSession);
          setMessages(updatedSession.messages);
          
          // NEW: Play AI response as speech
          if (response.role === 'assistant') {
            await ChatService.generateSpeech(response.content);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing voice message:', error);
    Alert.alert('Error', 'Failed to process voice message');
  } finally {
    setIsLoading(false);
  }
};
```

### **Step 5: Test**

1. Open the Chat tab
2. Type: "Hello, say something back to me"
3. Send the message
4. Listen for AI voice response 🔊

## 🔧 Advanced Customization

### **Change Voice Settings**

In ChatService:
```typescript
await this.speechModule.speak(text, {
  language: 'en-US',        // Change language
  pitch: 1.0,               // 0.5-2.0 (lower = deeper)
  rate: 0.9,                // 0.5-2.0 (lower = slower)
  onDone: resolve,
  onError: reject,
});
```

### **Different Languages**

```typescript
// Spanish
language: 'es-ES'

// French
language: 'fr-FR'

// German
language: 'de-DE'

// Chinese
language: 'zh-CN'
```

### **Add Stop/Pause Buttons**

```typescript
// Stop current speech
await ChatService.stopSpeech();

// These would be new methods in ChatService:
async stopSpeech(): Promise<void> {
  if (this.speechModule) {
    await this.speechModule.stop();
  }
}

async pauseSpeech(): Promise<void> {
  if (this.speechModule) {
    await this.speechModule.pause();
  }
}

async resumeSpeech(): Promise<void> {
  if (this.speechModule) {
    await this.speechModule.resume();
  }
}
```

## 🎚️ Volume and Audio Configuration

### **System Integration**

The speech will use the device's system volume settings. Users can control:
- Device volume buttons
- Settings > Sound
- Device speaker vs headphones

### **Fallback If No Sound Available**

```typescript
async generateSpeech(text: string): Promise<string> {
  try {
    // Check if speech is available
    const isSpeechAvailable = await this.speechModule.isSpeakingAsync();
    
    if (!isSpeechAvailable) {
      // Fallback: show notification instead
      console.warn('Speech not available, showing text instead');
      return text;
    }

    await this.speechModule.speak(text, { ... });
    return text;
  } catch (error) {
    // Fail gracefully
    console.error('TTS error:', error);
    return '';
  }
}
```

## 🚀 Migration to Premium TTS (Later)

When you want to upgrade to Google Cloud or ElevenLabs:

1. The implementation stays in `ChatService.generateSpeech()`
2. Just swap the provider code
3. Chat UI doesn't need to change
4. Seamless transition for users

## 📊 Performance Considerations

### **Expo Speech:**
- Response time: Instant (uses system TTS)
- Quality: Good for basic use
- Cost: Free
- Best for: MVP and testing

### **Google Cloud TTS:**
- Response time: 1-2 seconds (API call)
- Quality: Excellent
- Cost: $0-4/month typical use
- Best for: Production apps

### **ElevenLabs:**
- Response time: 1-2 seconds (API call)
- Quality: Excellent/Premium
- Cost: $5-99/month
- Best for: Premium user experience

## ⚠️ Important Notes

### **Permissions**

Make sure your `app.json` includes audio permissions:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-audio",
        {
          "microphonePermission": "Allow Memovox to access your microphone"
        }
      ],
      [
        "expo-speech",
        {
          "speechPermission": "Allow Memovox to read text aloud"
        }
      ]
    ]
  }
}
```

### **Battery Usage**

Playing audio will use battery. Consider:
- Allowing users to turn TTS on/off in settings
- Having a maximum length for responses
- Respecting device power-saving mode

### **Accessibility**

TTS helps accessibility for users with:
- Visual impairments
- Dyslexia
- Auditory learners

Make sure to:
- Allow enabling/disabling by user
- Sync with system accessibility settings
- Test with screen readers

## 🧪 Testing TTS

```typescript
// Quick test in console
const ChatService = require('./src/services/ChatService').default;
await ChatService.generateSpeech("Hello, this is a test. Can you hear me?");
```

## 📚 References

- Expo Speech: https://docs.expo.dev/versions/latest/sdk/speech/
- Google Cloud TTS: https://cloud.google.com/text-to-speech/docs
- ElevenLabs: https://elevenlabs.io/docs
- Azure Speech: https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/

## ✅ Implementation Checklist

- [ ] Install expo-speech (or chosen TTS)
- [ ] Update ChatService.generateSpeech()
- [ ] Update chat.tsx sendTextMessage()
- [ ] Update chat.tsx stopVoiceRecording()
- [ ] Test text-to-speech playback
- [ ] Test different voice settings
- [ ] Verify volume controls work
- [ ] Test with long messages
- [ ] Handle errors gracefully
- [ ] Update app permissions if needed

## 🎉 Next Steps

1. **Start with Expo Speech** - Simple, works great for MVP
2. **Test thoroughly** - Record sample conversations
3. **Get user feedback** - Does voice quality matter for your use case?
4. **Upgrade if needed** - Move to Google Cloud/ElevenLabs later if wanted

Your audio chat feature is now complete with AI voice responses! 🎉

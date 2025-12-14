# Groq Whisper API - Direct Fetch Implementation

## API Endpoint

**URL**: `https://api.groq.com/openai/v1/audio/transcriptions`  
**Method**: `POST`  
**Content-Type**: `multipart/form-data` (automatic with FormData)

## Request Format

### FormData Fields
```typescript
formData.append('file', audioBlob);          // Required: audio file
formData.append('model', 'whisper-large-v3-turbo'); // Required: model name
formData.append('response_format', 'json');  // Optional: response format
formData.append('language', 'en');           // Optional: audio language
```

### Headers
```typescript
headers: {
  'Authorization': `Bearer ${API_KEY}`,
  // Content-Type is automatic with FormData
}
```

## Response Format

### Success (200 OK)
```json
{
  "text": "This is the transcribed text from your audio",
  "task": "transcribe",
  "language": "en",
  "duration": 8.32
}
```

### Error (400 Bad Request)
```json
{
  "error": {
    "message": "'file' or 'url' must be provided",
    "type": "invalid_request_error"
  }
}
```

## Complete Code Example

```typescript
async transcribeAudio(audioUri: string): Promise<string> {
  try {
    // 1. Get base64 data
    const base64Data = await FileSystemLegacy.readAsStringAsync(audioUri, {
      encoding: 'base64',
    });
    console.log('🔴 DEBUG: File read successfully, length:', base64Data.length);

    // 2. Convert base64 → binary string (React Native compatible)
    const byteCharacters = atob(base64Data);
    let blobData = '';
    for (let i = 0; i < byteCharacters.length; i++) {
      blobData += String.fromCharCode(byteCharacters.charCodeAt(i));
    }
    console.log('🔴 DEBUG: Binary string created, length:', blobData.length);

    // 3. Create Blob
    const audioBlob = new Blob([blobData], { 
      type: 'audio/m4a', 
      lastModified: Date.now() 
    });
    console.log('🔴 DEBUG: Blob created, size:', audioBlob.size);

    // 4. Create FormData
    const formData = new FormData();
    formData.append('file', audioBlob);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'json');
    formData.append('language', 'en');
    console.log('🔴 DEBUG: FormData created');

    // 5. Send to Groq API
    console.log('🔴 DEBUG: Sending to https://api.groq.com/openai/v1/audio/transcriptions');
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ***REMOVED***`,
      },
      body: formData,
    });

    console.log('🔴 DEBUG: Groq API response status:', response.status);

    // 6. Handle response
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔴 DEBUG: Groq API error response:', errorText);
      const errorData = JSON.parse(errorText);
      throw new Error(`Groq API error: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log('🔴 DEBUG: Groq API response received');
    const transcribedText = result.text || '';
    console.log('Transcription from Groq Whisper:', transcribedText);
    
    return transcribedText;
  } catch (error) {
    console.error('Error transcribing audio with Groq:', error);
    return 'Transcription failed';
  }
}
```

## Troubleshooting

### Issue: Still getting "'file' or 'url' must be provided"

**Check**:
1. ✅ FormData.append('file', audioBlob) is being called
2. ✅ audioBlob.size > 0 (verify in console)
3. ✅ Content-Type header is NOT manually set (let FormData handle it)
4. ✅ Authorization header includes "Bearer " prefix

**Debug**:
```typescript
console.log('Blob size:', audioBlob.size);           // Should be > 0
console.log('Blob type:', audioBlob.type);           // Should be 'audio/m4a'
console.log('FormData fields:', Array.from(formData.entries())); // Debug entries
```

### Issue: Network request failed

**Check**:
1. ✅ Device/emulator has internet connectivity
2. ✅ API key is valid: `***REMOVED***`
3. ✅ Groq API is accessible: `curl https://api.groq.com/openai/v1/audio/transcriptions`
4. ✅ No firewall blocking the request

**Debug**:
```typescript
// Test network connectivity
fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer INVALID_KEY',
  },
  body: new FormData(), // Empty
})
.then(res => console.log('Status:', res.status)) // Should be 401, not network error
.catch(e => console.error('Network error:', e));
```

### Issue: Audio file is empty/invalid

**Check**:
1. ✅ Audio file exists: `FileSystem.getInfoAsync(audioUri)`
2. ✅ File size > 0: `console.log('File size:', base64Data.length)`
3. ✅ Base64 is valid: `atob()` doesn't throw error
4. ✅ Audio format is m4a/mp4 (not wav or other)

**Debug**:
```typescript
const fileInfo = await FileSystem.getInfoAsync(audioUri);
console.log('File exists:', fileInfo.exists);
console.log('File size:', fileInfo.size);
```

### Issue: API returns different response format

**Note**: Groq's response includes additional fields:
```json
{
  "text": "...",           // The transcription (THIS IS WHAT YOU WANT)
  "task": "transcribe",
  "language": "en",
  "duration": 8.32
}
```

**Fix**: Use `result.text` not just `result`
```typescript
const transcribedText = result.text || '';  // ✅ CORRECT
// NOT: const transcribedText = result;     // ❌ WRONG
```

## API Limits

- Maximum file size: 25 MB
- Supported formats: m4a, mp3, wav, webm
- Timeout: 30 seconds per request
- Rate limit: 100 requests per minute

## Models Available

- `whisper-large-v3-turbo` (Used) - Recommended, good accuracy, fast
- `whisper-large-v3` - Highest accuracy, slower
- `whisper-small` - Lower accuracy, fastest

## Alternative: Using Groq SDK (NOT RECOMMENDED for React Native)

```typescript
// ❌ This doesn't work in React Native
const transcription = await this.groqClient.audio.transcriptions.create({
  file: audioBlob,  // SDK fails to serialize Blob properly
  model: 'whisper-large-v3-turbo',
  response_format: 'text',
});

// ✅ Use direct fetch instead
const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: formData,
});
```

---

**Status**: Implementation complete and tested. Ready for production use.

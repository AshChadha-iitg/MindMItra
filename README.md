# MindMitra VoiceChat - AI Assistant

A modern, voice-enabled chat interface that integrates with Google's Gemini API to provide an intelligent conversational experience powered by MindMitra AI.

## Features

- **Clean Chat Interface**: Modern, responsive design with smooth animations
- **MindMitra AI Integration**: Powered by Google's Gemini 2.0 Flash for intelligent responses
- **Voice Input**: Click the microphone to speak your message
- **Text-to-Speech**: AI responses are automatically read aloud
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Secure API Key Storage**: Your API key is stored locally in your browser

## How to Use

1. **Get a Gemini API Key**:
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create an account and generate an API key
   - Copy your API key

2. **Enter Your API Key**:
   - Open the chat interface
   - Paste your Gemini API key in the input field at the bottom
   - Click "Save" to store it securely

3. **Start Chatting**:
   - Type your message in the input box, or
   - Click the microphone button to use voice input
   - Press Enter or click the send button

4. **Voice Features**:
   - **Voice Input**: Click the red microphone button and speak
   - **Auto-Speech**: Toggle the switch to enable/disable automatic reading of AI responses
   - **Manual Speech**: AI responses will be read aloud automatically if enabled

## Browser Compatibility

- **Voice Recognition**: Chrome, Edge, Safari (latest versions)
- **Text-to-Speech**: All modern browsers
- **Chat Interface**: All modern browsers

## Privacy & Security

- Your API key is stored locally in your browser only
- No data is sent to any servers except Google's official Gemini API
- Voice data is processed locally by your browser

## Customization

The interface uses a calm, light color scheme with:
- Soft gradients and rounded corners
- Smooth animations and transitions
- Responsive design for all screen sizes
- Clean typography for easy reading

## Technical Details

- **Frontend**: Pure HTML, CSS, and JavaScript
- **API**: Google Gemini 1.5 Flash (branded as MindMitra)
- **Voice**: Web Speech API for recognition and synthesis
- **Storage**: LocalStorage for API key and preferences

## Troubleshooting

- **Voice not working**: Ensure you're using a supported browser and have given microphone permissions
- **API errors**: Check your Gemini API key and ensure it's valid
- **No speech output**: Check your browser's audio settings and the auto-speak toggle

## Files Structure

```
VoiceChat/
├── index.html      # Main HTML structure
├── styles.css      # Styling and animations
├── script.js       # JavaScript functionality
└── README.md       # This file
```

Enjoy chatting with your MindMitra AI assistant!

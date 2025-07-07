class VoiceChatApp {
    constructor() {
        this.apiKey = ''; // Pre-configured API key
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.autoSpeak = true;
        this.conversationHistory = []; // Track conversation for context
        this.lastRedirectIndex = -1; // Prevent repeating same redirect message
        
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeSpeechRecognition();
        this.loadSettings();
    }
    
    initializeElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.microphoneBtn = document.getElementById('microphoneBtn');
        this.voiceStatus = document.getElementById('voiceStatus');
        this.autoSpeakToggle = document.getElementById('autoSpeak');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        // Hide the settings panel since API key is pre-configured
        const settingsPanel = document.querySelector('.settings-panel');
        if (settingsPanel) {
            settingsPanel.style.display = 'none';
        }
    }
    
    initializeEventListeners() {
        // Send message events
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Voice recognition events
        this.microphoneBtn.addEventListener('click', () => this.toggleVoiceRecognition());
        
        // Auto-speak toggle (if visible)
        if (this.autoSpeakToggle) {
            this.autoSpeakToggle.addEventListener('change', (e) => {
                this.autoSpeak = e.target.checked;
                localStorage.setItem('auto_speak', this.autoSpeak);
            });
        }
        
        // Input focus event
        this.userInput.addEventListener('input', () => {
            this.sendBtn.disabled = this.userInput.value.trim() === '';
        });
        
        // Initialize send button state
        this.sendBtn.disabled = true;
    }
    
    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            this.recognition.onstart = () => {
                this.isListening = true;
                this.microphoneBtn.classList.add('recording');
                this.voiceStatus.style.display = 'flex';
            };
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.userInput.value = transcript;
                this.sendBtn.disabled = false;
                this.userInput.focus();
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.showNotification('Voice recognition error. Please try again.', 'error');
                this.stopVoiceRecognition();
            };
            
            this.recognition.onend = () => {
                this.stopVoiceRecognition();
            };
        } else {
            this.microphoneBtn.style.display = 'none';
            console.warn('Speech recognition not supported in this browser');
        }
    }
    
    loadSettings() {
        // Load auto-speak setting
        const autoSpeakSetting = localStorage.getItem('auto_speak');
        if (autoSpeakSetting !== null) {
            this.autoSpeak = autoSpeakSetting === 'true';
            if (this.autoSpeakToggle) {
                this.autoSpeakToggle.checked = this.autoSpeak;
            }
        }
    }
    
    toggleVoiceRecognition() {
        if (this.isListening) {
            this.recognition.stop();
        } else {
            if (!this.recognition) {
                this.showNotification('Voice recognition not supported in this browser.', 'error');
                return;
            }
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Error starting speech recognition:', error);
                this.showNotification('Error starting voice recognition.', 'error');
            }
        }
    }
    
    stopVoiceRecognition() {
        this.isListening = false;
        this.microphoneBtn.classList.remove('recording');
        this.voiceStatus.style.display = 'none';
    }
    
    async sendMessage() {
        const message = this.userInput.value.trim();
        if (!message) return;
        
        // Add user message to chat
        this.addMessage(message, 'user');
        this.userInput.value = '';
        this.sendBtn.disabled = true;
        
        // Show loading
        this.showLoading(true);
        
        try {
            const response = await this.callMindMitra(message);
            this.addMessage(response, 'ai');
            
            // Add to conversation history for context
            this.conversationHistory.push({
                user: message,
                ai: response,
                timestamp: Date.now()
            });
            
            // Keep only last 5 exchanges to prevent context overload
            if (this.conversationHistory.length > 5) {
                this.conversationHistory.shift();
            }
            
            // Speak the response if auto-speak is enabled
            if (this.autoSpeak) {
                this.speakText(response);
            }
        } catch (error) {
            console.error('Error calling MindMitra:', error);
            this.addMessage('Sorry, I encountered an error. Please try again later.', 'ai');
            this.showNotification('Error communicating with MindMitra AI. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    async callMindMitra(message) {
        // First, check if the message is related to mental health
        const isHealthRelated = await this.checkMentalHealthRelevance(message);
        
        if (!isHealthRelated) {
            return this.getMentalHealthRedirectMessage();
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking-exp:generateContent?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are MindMitra, a warm and empathetic mental health companion. Respond in a natural, conversational way as if you're talking to a close friend who trusts you. 

Guidelines for your responses:
- Match the user's energy level: ${this.detectUserEnergy(message)} energy detected
- Use a warm, caring, and genuine tone
- Speak naturally without being overly formal or clinical
- Show empathy and understanding
- Ask follow-up questions when appropriate
- Use "I" statements and personal language
- Vary your response style to avoid repetition
- Keep responses concise but meaningful (2-3 sentences for greetings, longer for complex topics)
- Use **bold** for key points or important advice
- Format with proper line breaks for readability

${this.conversationHistory.length > 0 ? `Recent conversation context: ${this.conversationHistory.slice(-2).map(h => `User: ${h.user} | You: ${h.ai.replace(/<[^>]*>/g, '').substring(0, 100)}...`).join(' | ')}` : ''}

Focus on: mental wellness, emotional support, stress management, mindfulness, therapy techniques, self-care, mental health awareness, coping strategies, and psychological well-being.

User's message: ${message}`
                    }]
                }],
                generationConfig: {
                    temperature: 0.9, // Higher creativity for more natural responses
                    topK: 50,
                    topP: 0.95,
                    maxOutputTokens: 800, // Shorter responses for more natural conversation
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const responseText = data.candidates[0].content.parts[0].text;
            return this.formatResponseText(responseText);
        } else {
            throw new Error('No response generated from MindMitra');
        }
    }
    
    async checkMentalHealthRelevance(message) {
        // List of mental health related keywords and topics
        const mentalHealthKeywords = [
            'mental', 'health', 'stress', 'anxiety', 'depression', 'therapy', 'counseling',
            'mindfulness', 'meditation', 'wellness', 'emotional', 'feeling', 'mood',
            'psychology', 'psychiatric', 'self-care', 'coping', 'support', 'help',
            'sad', 'happy', 'worried', 'panic', 'fear', 'anger', 'grief', 'trauma',
            'bipolar', 'ptsd', 'ocd', 'adhd', 'autism', 'schizophrenia', 'eating disorder',
            'sleep', 'insomnia', 'relaxation', 'breathing', 'exercise', 'routine',
            'relationships', 'communication', 'boundaries', 'confidence', 'self-esteem',
            'motivation', 'goals', 'purpose', 'meaning', 'identity', 'values',
            'burnout', 'overwhelmed', 'exhausted', 'tired', 'energy', 'balance',
            'suicide', 'self-harm', 'crisis', 'emergency', 'hopeless', 'helpless'
        ];
        
        // Convert message to lowercase for checking
        const lowerMessage = message.toLowerCase();
        
        // Check if any mental health keywords are present
        const hasKeywords = mentalHealthKeywords.some(keyword => 
            lowerMessage.includes(keyword)
        );
        
        // Check for common mental health question patterns
        const mentalHealthPatterns = [
            /how.*feel/i,
            /what.*do.*when/i,
            /help.*with/i,
            /advice.*about/i,
            /cope.*with/i,
            /manage.*my/i,
            /improve.*my/i,
            /better.*at/i,
            /struggle.*with/i,
            /dealing.*with/i,
            /ways.*to/i,
            /tips.*for/i,
            /how.*handle/i,
            /support.*for/i
        ];
        
        const hasPattern = mentalHealthPatterns.some(pattern => 
            pattern.test(lowerMessage)
        );
        
        // Check for greeting messages (always allow)
        const greetingPatterns = [
            /^(hi|hello|hey|good morning|good afternoon|good evening)/i,
            /^(how are you|what's up|sup)/i,
            /^(thank you|thanks|bye|goodbye)/i
        ];
        
        const isGreeting = greetingPatterns.some(pattern => 
            pattern.test(lowerMessage.trim())
        );
        
        // Allow if it's a greeting, has keywords, or matches patterns
        return isGreeting || hasKeywords || hasPattern;
    }
    
    detectUserEnergy(message) {
        const lowerMessage = message.toLowerCase();
        
        // High energy indicators
        const highEnergyWords = ['excited', 'amazing', 'awesome', 'great', 'fantastic', 'wonderful', 'love', 'happy', 'joy', 'celebrate'];
        const highEnergyPunctuation = /[!]{2,}|[!].*[!]/;
        const allCaps = /[A-Z]{3,}/;
        
        // Low energy indicators
        const lowEnergyWords = ['tired', 'exhausted', 'sad', 'down', 'low', 'depressed', 'overwhelmed', 'drained', 'stuck', 'hopeless'];
        const lowEnergyPunctuation = /\.{2,}|\.$/;
        
        // Neutral/calm indicators
        const neutralWords = ['okay', 'fine', 'alright', 'normal', 'regular', 'usual'];
        
        const hasHighEnergy = highEnergyWords.some(word => lowerMessage.includes(word)) || 
                             highEnergyPunctuation.test(message) || 
                             allCaps.test(message);
        
        const hasLowEnergy = lowEnergyWords.some(word => lowerMessage.includes(word)) || 
                            (lowEnergyPunctuation.test(message) && message.length > 10);
        
        const hasNeutralEnergy = neutralWords.some(word => lowerMessage.includes(word));
        
        if (hasHighEnergy) return 'high';
        if (hasLowEnergy) return 'low';
        if (hasNeutralEnergy) return 'neutral';
        
        // Default based on message structure
        if (message.includes('!')) return 'medium-high';
        if (message.includes('?')) return 'medium';
        return 'neutral';
    }
    
    getMentalHealthRedirectMessage() {
        const messages = [
            "Hey! I'm here for your mental wellness journey. What's on your mind?",
            
            "I'm your mental health buddy! Whether it's stress, emotions, or just need to talk - I'm here. What's up?",
            
            "I focus on emotional wellness and mental health support. How are you feeling today?",
            
            "I'm here to help with anything mental health related. What's weighing on you?",
            
            "Mental wellness is my thing! What can I help you with today?"
        ];
        
        // Avoid repeating the same redirect message
        let messageIndex;
        do {
            messageIndex = Math.floor(Math.random() * messages.length);
        } while (messageIndex === this.lastRedirectIndex && messages.length > 1);
        
        this.lastRedirectIndex = messageIndex;
        return this.formatResponseText(messages[messageIndex]);
    }
    
    formatResponseText(text) {
        // Format the text with proper HTML structure
        let formattedText = text
            // First, normalize line breaks
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            
            // Convert **bold** to <strong>
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Convert *italic* to <em>
            .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
            
            // Handle headings (# ## ###)
            .replace(/^#{1,6}\s+(.+)$/gm, '<h3><strong>$1</strong></h3>')
            
            // Handle numbered lists with proper spacing
            .replace(/^(\d+\.\s+)(.+)$/gm, '<div class="list-item"><strong>$1</strong>$2</div>')
            
            // Handle bullet points with proper spacing
            .replace(/^[\-\*]\s+(.+)$/gm, '<div class="list-item">• $1</div>')
            
            // Handle multiple paragraphs - split by double line breaks
            .split(/\n\s*\n/)
            .map(paragraph => {
                // Skip empty paragraphs
                if (!paragraph.trim()) return '';
                
                // If it's already wrapped in div or h3, don't wrap in p
                if (paragraph.includes('<div class="list-item">') || paragraph.includes('<h3>')) {
                    return paragraph;
                }
                
                // Convert single line breaks within paragraphs to <br>
                const formattedParagraph = paragraph.replace(/\n/g, '<br>');
                return `<p>${formattedParagraph}</p>`;
            })
            .filter(p => p) // Remove empty strings
            .join('')
            
            // Clean up and add proper spacing
            .replace(/<\/p><div class="list-item">/g, '</p><div class="list-container"><div class="list-item">')
            .replace(/<\/div><p>/g, '</div></div><p>')
            .replace(/(<div class="list-item">.*?<\/div>)(?=<div class="list-item">)/g, '$1')
            
            // Add closing container for list items that don't have it
            .replace(/(<div class="list-item">.*?<\/div>)(?!<\/div><\/div>)(?!<div class="list-item">)/g, '$1</div>')
            .replace(/<div class="list-item">/g, '<div class="list-container"><div class="list-item">')
            .replace(/<\/div><\/div><\/div>/g, '</div></div>')
            
            // Final cleanup
            .replace(/\s+/g, ' ')
            .replace(/> </g, '><')
            .trim();
        
        return formattedText;
    }
    
    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-brain"></i>';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Use innerHTML for AI messages to support formatting, textContent for user messages
        if (sender === 'ai') {
            contentDiv.innerHTML = content;
        } else {
            const paragraph = document.createElement('p');
            paragraph.textContent = content;
            contentDiv.appendChild(paragraph);
        }
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    speakText(text) {
        // Stop any ongoing speech
        this.synthesis.cancel();
        
        // Strip HTML tags and markdown formatting for speech synthesis
        const cleanText = text
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&[^;]+;/g, ' ') // Remove HTML entities
            .replace(/\*\*/g, '') // Remove bold markdown
            .replace(/\*/g, '') // Remove italic markdown
            .replace(/#{1,6}\s*/g, '') // Remove heading markdown
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to just text
            .replace(/`([^`]+)`/g, '$1') // Remove code formatting
            .replace(/^\s*[-*+]\s+/gm, '') // Remove bullet points
            .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            // Add pauses for natural speech flow
            .replace(/\./g, '.') // Keep periods for natural pauses
            .replace(/:/g, ':,') // Add comma after colons for pause
            .replace(/;/g, ';,') // Add comma after semicolons for pause
            .replace(/\n/g, ', ') // Convert line breaks to commas for short pauses
            .replace(/,\s*,/g, ',') // Remove duplicate commas
            .trim(); // Remove leading/trailing whitespace
        
        // Create new utterance
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 0.90; // Natural pace - not too slow, not too fast
        utterance.pitch = 1.0; // Natural pitch for more engaging voice
        utterance.volume = 0.8; // Slightly louder for clarity
        
        // Try to use the most natural voice available
        const voices = this.synthesis.getVoices();
        
        // Priority order for natural-sounding voices
        const preferredVoiceNames = [
            'Microsoft Zira Desktop', // Windows natural voice
            'Microsoft David Desktop', // Windows natural voice
            'Google US English', // Google's natural voice
            'Alex', // macOS natural voice
            'Samantha', // macOS natural voice
            'Karen', // macOS natural voice
            'Moira', // macOS natural voice
            'Tessa', // macOS natural voice
        ];
        
        let preferredVoice = null;
        
        // Try to find the best voice in order of preference
        for (const voiceName of preferredVoiceNames) {
            preferredVoice = voices.find(voice => 
                voice.name.includes(voiceName) && voice.lang.startsWith('en')
            );
            if (preferredVoice) break;
        }
        
        // Fallback to any good English voice if preferred voices not found
        if (!preferredVoice) {
            preferredVoice = voices.find(voice => 
                voice.lang.startsWith('en') && 
                !voice.name.toLowerCase().includes('eSpeak'.toLowerCase()) && // Avoid robotic eSpeak voices
                (voice.name.includes('Female') || voice.name.includes('Male') || 
                 voice.name.includes('Google') || voice.name.includes('Microsoft'))
            ) || voices.find(voice => voice.lang.startsWith('en'));
        }
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        this.synthesis.speak(utterance);
    }
    
    showLoading(show) {
        this.loadingOverlay.style.display = show ? 'flex' : 'none';
    }
    
    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 10px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        if (type === 'success') {
            notification.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        } else {
            notification.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VoiceChatApp();
});

// Load voices when they become available
if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = () => {
        // Voices are now loaded
    };
}

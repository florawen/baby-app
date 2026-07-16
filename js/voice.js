const Voice = {
    isSupported: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    activeRecognition: null,
    activeButton: null,

    init() {
        if (!this.isSupported) return;

        // Add mic buttons to key text inputs
        const targets = [
            'entry-title',
            'entry-text',
            'feed-notes',
            'diaper-notes',
            'sleep-notes',
            'growth-notes',
            'scrapbook-caption',
            'contact-notes-input',
            'item-notes',
            'registry-item-notes'
        ];

        targets.forEach(id => {
            const el = document.getElementById(id);
            if (el) this.addMicButton(el);
        });
    },

    addMicButton(inputEl) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mic-btn';
        btn.setAttribute('aria-label', 'Voice input');
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;

        // Wrap input and button together
        const wrapper = document.createElement('div');
        wrapper.className = 'voice-input-wrapper';
        inputEl.parentNode.insertBefore(wrapper, inputEl);
        wrapper.appendChild(inputEl);
        wrapper.appendChild(btn);

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.activeButton === btn) {
                this.stopListening();
            } else {
                this.startListening(inputEl, btn);
            }
        });
    },

    startListening(inputEl, btn) {
        // Stop any existing session
        if (this.activeRecognition) {
            this.stopListening();
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        // iOS Safari doesn't support continuous well, so keep sessions shorter
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        recognition.continuous = !isIOS;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        const startValue = inputEl.value;
        let finalTranscript = '';

        recognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interim += transcript;
                }
            }

            const separator = startValue && !startValue.endsWith(' ') ? ' ' : '';
            inputEl.value = startValue + separator + finalTranscript + interim;

            // Trigger input event for any listeners
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        };

        recognition.onerror = (event) => {
            console.warn('Speech recognition error:', event.error);
            if (event.error !== 'no-speech') {
                this.stopListening();
            }
        };

        recognition.onend = () => {
            // On iOS (non-continuous), auto-restart if user hasn't stopped
            if (this.activeButton === btn && !recognition.continuous) {
                try { recognition.start(); } catch (e) { this.stopListening(); }
            } else if (this.activeButton === btn) {
                this.stopListening();
            }
        };

        recognition.start();
        this.activeRecognition = recognition;
        this.activeButton = btn;
        btn.classList.add('mic-active');
        inputEl.focus();
    },

    stopListening() {
        if (this.activeRecognition) {
            this.activeRecognition.stop();
            this.activeRecognition = null;
        }
        if (this.activeButton) {
            this.activeButton.classList.remove('mic-active');
            this.activeButton = null;
        }
    }
};

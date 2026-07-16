const VoiceMemo = {
    mediaRecorder: null,
    audioChunks: [],
    audioBlob: null,
    audioUrl: null,
    timerInterval: null,
    startTime: null,
    recognition: null,
    transcript: '',

    init() {
        const btn = document.getElementById('voice-memo-btn');
        const deleteBtn = document.getElementById('voice-memo-delete');

        if (!btn) return;

        btn.addEventListener('click', () => {
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                this.stopRecording();
            } else {
                this.startRecording();
            }
        });

        deleteBtn.addEventListener('click', () => {
            this.clear();
        });
    },

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioChunks = [];
            this.transcript = '';

            // Set up MediaRecorder for audio
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: this.getSupportedMimeType()
            });

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.audioChunks.push(e.data);
            };

            this.mediaRecorder.onstop = () => {
                // Stop all tracks
                stream.getTracks().forEach(t => t.stop());
                this.audioBlob = new Blob(this.audioChunks, { type: this.getSupportedMimeType() });
                this.audioUrl = URL.createObjectURL(this.audioBlob);

                // Show preview
                const audio = document.getElementById('voice-memo-audio');
                audio.src = this.audioUrl;
                document.getElementById('voice-memo-preview').classList.remove('hidden');

                // Show transcript status
                if (this.transcript) {
                    this.applyTranscript();
                }
            };

            this.mediaRecorder.start(1000); // collect in 1s chunks

            // Start speech recognition in parallel for transcription
            this.startTranscription();

            // Update UI
            const btn = document.getElementById('voice-memo-btn');
            btn.innerHTML = '<span class="voice-memo-icon">⏹️</span> Stop';
            btn.classList.add('recording');

            // Start timer
            this.startTime = Date.now();
            const timerEl = document.getElementById('voice-memo-timer');
            timerEl.classList.remove('hidden');
            this.timerInterval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
                const mins = Math.floor(elapsed / 60);
                const secs = elapsed % 60;
                timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            }, 1000);

        } catch (err) {
            console.error('Mic access denied:', err);
            const status = document.getElementById('voice-memo-status');
            status.textContent = 'Microphone access denied. Please allow mic access and try again.';
            status.classList.remove('hidden');
        }
    },

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }

        if (this.recognition) {
            this.recognition.stop();
            this.recognition = null;
        }

        // Reset button
        const btn = document.getElementById('voice-memo-btn');
        btn.innerHTML = '<span class="voice-memo-icon">🎙️</span> Record Memo';
        btn.classList.remove('recording');

        // Stop timer
        clearInterval(this.timerInterval);
        document.getElementById('voice-memo-timer').classList.add('hidden');
    },

    startTranscription() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            const status = document.getElementById('voice-memo-status');
            status.textContent = 'Voice memo saved. Auto-transcription not supported in this browser.';
            status.classList.remove('hidden');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    this.transcript += event.results[i][0].transcript + ' ';
                }
            }
        };

        this.recognition.onerror = (event) => {
            // Silently handle — transcription is a bonus, not required
            console.warn('Transcription error:', event.error);
        };

        this.recognition.start();
    },

    applyTranscript() {
        if (!this.transcript.trim()) return;

        const textArea = document.getElementById('entry-text');
        const existing = textArea.value.trim();
        const separator = existing ? '\n\n' : '';
        textArea.value = existing + separator + this.transcript.trim();

        const status = document.getElementById('voice-memo-status');
        status.textContent = 'Transcribed and added to your entry text above.';
        status.classList.remove('hidden');
    },

    clear() {
        if (this.audioUrl) {
            URL.revokeObjectURL(this.audioUrl);
        }
        this.audioBlob = null;
        this.audioUrl = null;
        this.audioChunks = [];
        this.transcript = '';

        document.getElementById('voice-memo-preview').classList.add('hidden');
        document.getElementById('voice-memo-status').classList.add('hidden');
        document.getElementById('voice-memo-audio').src = '';
    },

    getSupportedMimeType() {
        // Prefer webm, fall back to mp4 for Safari
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
        if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
        if (MediaRecorder.isTypeSupported('audio/ogg')) return 'audio/ogg';
        return 'audio/webm'; // fallback
    },

    // Called by Journal.save() to upload and get the URL
    async uploadMemo() {
        if (!this.audioBlob) return null;

        const ext = this.audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
        const path = `journal/memo_${Date.now()}.${ext}`;
        const url = await DB.uploadPhoto(this.audioBlob, path);
        return { audioUrl: url, audioPath: path, transcript: this.transcript.trim() };
    }
};

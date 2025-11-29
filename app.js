import defaultWords from './word.json';
import defaultDictionary from './dictionary.json';

document.addEventListener('DOMContentLoaded', () => {
    // State
    let words = [];
    let dictionary = defaultDictionary;
    let knownWords = JSON.parse(localStorage.getItem('vocab_known')) || [];
    let unknownWords = JSON.parse(localStorage.getItem('vocab_unknown')) || [];
    let currentWordIndex = 0;
    let activeWords = []; // Words that are not known yet

    // DOM Elements
    const cardContainer = document.getElementById('card-container');
    const unknownBtn = document.getElementById('unknown-btn');
    const knownBtn = document.getElementById('known-btn');
    const speakBtn = document.getElementById('speak-btn');
    const statsBtn = document.getElementById('stats-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const statsModal = document.getElementById('stats-modal');
    const settingsModal = document.getElementById('settings-modal');
    const closeButtons = document.querySelectorAll('.close-modal');
    const jsonUpload = document.getElementById('json-upload');
    const resetBtn = document.getElementById('reset-progress');
    const knownCountEl = document.getElementById('known-count');
    const unknownCountEl = document.getElementById('unknown-count');
    const unknownListEl = document.getElementById('unknown-list');

    // Initialization
    init();

    async function init() {
        try {
            // Load Words
            await loadWords();

            updateStats();
        } catch (error) {
            console.error('Initialization failed:', error);
            cardContainer.innerHTML = '<p>Error loading data. Please refresh.</p>';
        }
    }

    async function loadWords(customList = null) {
        if (customList) {
            words = customList;
        } else {
            words = defaultWords;
        }

        // Filter out known words to create the active learning list
        // We also want to include unknown words that need review
        // Strategy: Active list = (All Words - Known Words)
        // We can prioritize Unknown words if we want, but for now let's just filter

        activeWords = words.filter(word => !knownWords.includes(word));

        // Shuffle active words slightly or keep order? Let's keep order for now but maybe shuffle later
        // For now, simple filter

        if (activeWords.length > 0) {
            renderCard(activeWords[0]);
        } else {
            showCompletionState();
        }
    }

    function renderCard(word) {
        if (!word) return;

        const data = dictionary[word] || { zh: '...', ipa: '' };
        const imageUrl = `https://image.pollinations.ai/prompt/${word}%20fantasy%20art%20illustration%20magic%20the%20gathering%20style?width=400&height=300&nologo=true`;

        const cardHtml = `
            <div class="card" id="current-card">
                <div class="mtg-frame">
                    <div class="mtg-inner-border">
                        <!-- Title Bar -->
                        <div class="mtg-title-bar">
                            <span class="mtg-title">${word}</span>
                            <div class="mtg-mana-cost" onclick="document.getElementById('speak-btn').click()">
                                <span class="material-icons-round" style="font-size: 16px; color: #333;">volume_up</span>
                            </div>
                        </div>

                        <!-- Art -->
                        <div class="mtg-art-container">
                            <img src="${imageUrl}" alt="${word}" class="mtg-art" onerror="this.src='https://placehold.co/400x300?text=${word}'">
                        </div>

                        <!-- Type Line -->
                        <div class="mtg-type-line">
                            <span class="mtg-type-text">Artifact • ${data.ipa || '/.../'}</span>
                            <div class="mtg-set-icon"></div>
                        </div>

                        <!-- Text Box -->
                        <div class="mtg-text-box">
                            <p class="mtg-definition">${data.zh}</p>
                            <div class="mtg-flavor-text">
                                "The meaning of this word is ancient and powerful."
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Bottom Info (Outside Frame) -->
                <div class="mtg-bottom-info">
                    <span>001/100 R</span>
                    <span>™ & © 2025 VocabGram</span>
                </div>
            </div>
        `;

        cardContainer.innerHTML = cardHtml;

        // Preload next image
        if (activeWords.length > 1) {
            const nextWord = activeWords[1];
            const nextImg = new Image();
            nextImg.src = `https://image.pollinations.ai/prompt/${nextWord}%20fantasy%20art%20illustration%20magic%20the%20gathering%20style?width=400&height=300&nologo=true`;
        }
    }

    function handleDecision(type) {
        const currentWord = activeWords[0];
        if (!currentWord) return;

        const card = document.getElementById('current-card');

        // Animation
        const translateX = type === 'known' ? 100 : -100;
        const rotate = type === 'known' ? 20 : -20;

        card.style.transform = `translate(${translateX}%, -20px) rotate(${rotate}deg)`;
        card.style.opacity = '0';

        setTimeout(() => {
            if (type === 'known') {
                if (!knownWords.includes(currentWord)) {
                    knownWords.push(currentWord);
                    // Remove from unknown if it was there
                    unknownWords = unknownWords.filter(w => w !== currentWord);
                }
            } else {
                if (!unknownWords.includes(currentWord)) {
                    unknownWords.push(currentWord);
                }
                // Move to end of active list to review again later in session?
                // Or just keep in unknown list. 
                // For this simple app, let's just move to next word.
            }

            saveProgress();
            activeWords.shift(); // Remove current word

            if (type === 'unknown') {
                // If unknown, maybe add it back to the end of the queue for this session?
                // activeWords.push(currentWord); 
                // Let's not do infinite loop for now, just mark as unknown list
            }

            if (activeWords.length > 0) {
                renderCard(activeWords[0]);
            } else {
                showCompletionState();
            }

            updateStats();
        }, 300);
    }

    function showCompletionState() {
        const hasUnknown = unknownWords.length > 0;
        const message = hasUnknown
            ? `You have ${unknownWords.length} words to review.`
            : "You've mastered all the words!";

        const actionButton = hasUnknown
            ? `<button id="review-btn" class="action-btn" style="width: auto; padding: 0 24px; border-radius: 24px; background: var(--primary-color); color: white; font-weight: 600;">
                 Review ${unknownWords.length} Words
               </button>`
            : `<button id="reset-all-btn" class="action-btn" style="width: auto; padding: 0 24px; border-radius: 24px; background: var(--text-main); color: white; font-weight: 600;">
                 Start Over
               </button>`;

        cardContainer.innerHTML = `
            <div class="card-content">
                <h2>All Caught Up! 🎉</h2>
                <p style="margin-bottom: 24px; color: var(--text-secondary);">${message}</p>
                ${actionButton}
            </div>
        `;

        if (hasUnknown) {
            document.getElementById('review-btn').addEventListener('click', () => {
                startReviewSession();
            });
        } else {
            document.getElementById('reset-all-btn').addEventListener('click', () => {
                if (confirm('Reset all progress and start over?')) {
                    knownWords = [];
                    unknownWords = [];
                    saveProgress();
                    loadWords();
                }
            });
        }
    }

    function startReviewSession() {
        if (unknownWords.length === 0) {
            alert("No unknown words to review!");
            return;
        }
        activeWords = [...unknownWords];
        // Shuffle for better practice
        activeWords.sort(() => Math.random() - 0.5);
        renderCard(activeWords[0]);
        statsModal.classList.add('hidden');
    }

    // Voice selection logic
    let selectedVoice = null;

    function loadVoices() {
        const voices = window.speechSynthesis.getVoices();
        // Priority list for better US voices
        const preferredVoices = [
            'Google US English',
            'Samantha',
            'Microsoft David',
            'Alex'
        ];

        // Try to find a preferred voice
        for (const name of preferredVoices) {
            const voice = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
            if (voice) {
                selectedVoice = voice;
                break;
            }
        }

        // Fallback to any en-US voice
        if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang === 'en-US');
        }
    }

    // Handle async voice loading
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    loadVoices(); // Try loading immediately in case they are ready

    function speakWord() {
        const currentWord = activeWords[0];
        if (currentWord) {
            // Cancel any current speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(currentWord);
            utterance.lang = 'en-US';
            utterance.rate = 0.9; // Slightly slower for clarity

            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }

            window.speechSynthesis.speak(utterance);
        }
    }

    function saveProgress() {
        localStorage.setItem('vocab_known', JSON.stringify(knownWords));
        localStorage.setItem('vocab_unknown', JSON.stringify(unknownWords));
    }

    function updateStats() {
        knownCountEl.textContent = knownWords.length;
        unknownCountEl.textContent = unknownWords.length;

        const practiceBtnHtml = unknownWords.length > 0
            ? `<button id="practice-unknown-btn" style="width: 100%; padding: 12px; margin-bottom: 16px; background: var(--primary-color); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                 Practice ${unknownWords.length} Unknown Words
               </button>`
            : '';

        unknownListEl.innerHTML = practiceBtnHtml + unknownWords.map(w => `
            <li>
                <span>${w}</span>
                <span style="color: #888;">${dictionary[w]?.zh || ''}</span>
            </li>
        `).join('');

        if (unknownWords.length > 0) {
            document.getElementById('practice-unknown-btn')?.addEventListener('click', startReviewSession);
        }
    }

    // Event Listeners
    knownBtn.addEventListener('click', () => handleDecision('known'));
    unknownBtn.addEventListener('click', () => handleDecision('unknown'));
    speakBtn.addEventListener('click', speakWord);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') handleDecision('known');
        if (e.key === 'ArrowLeft') handleDecision('unknown');
        if (e.key === ' ' || e.key === 'ArrowUp') speakWord();
    });

    // Modals
    statsBtn.addEventListener('click', () => {
        updateStats();
        statsModal.classList.remove('hidden');
    });

    settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));

    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            statsModal.classList.add('hidden');
            settingsModal.classList.add('hidden');
        });
    });

    // Settings
    resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all progress?')) {
            knownWords = [];
            unknownWords = [];
            saveProgress();
            loadWords(); // Reload
            settingsModal.classList.add('hidden');
        }
    });

    jsonUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const customWords = JSON.parse(event.target.result);
                    if (Array.isArray(customWords)) {
                        loadWords(customWords);
                        settingsModal.classList.add('hidden');
                        alert('Custom list loaded!');
                    } else {
                        alert('Invalid JSON format. Expected an array of strings.');
                    }
                } catch (err) {
                    alert('Error parsing JSON');
                }
            };
            reader.readAsText(file);
        }
    });
});

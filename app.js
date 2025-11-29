// Import level data
import level1Data from './level1.json';
import level2Data from './level2.json';

// App state
let currentLevel = null;
let dictionary = {};
let activeWords = [];
let currentIndex = 0;
let knownWords = [];
let unknownWords = [];

// DOM Elements
const cardContainer = document.getElementById('card-container');
const knownBtn = document.getElementById('known-btn');
const unknownBtn = document.getElementById('unknown-btn');
const speakBtn = document.getElementById('speak-btn');
const statsBtn = document.getElementById('stats-btn');
const settingsBtn = document.getElementById('settings-btn');
const levelSelectionModal = document.getElementById('level-selection-modal');
const statsModal = document.getElementById('stats-modal');
const settingsModal = document.getElementById('settings-modal');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    showLevelSelection();
    setupEventListeners();
});

function showLevelSelection() {
    levelSelectionModal.classList.remove('hidden');
}

function setupEventListeners() {
    // Level selection
    document.querySelectorAll('.level-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const level = btn.dataset.level;
            startGame(level);
        });
    });

    // Game buttons
    knownBtn.addEventListener('click', () => markWord('known'));
    unknownBtn.addEventListener('click', () => markWord('unknown'));
    speakBtn.addEventListener('click', () => speakWord(activeWords[currentIndex]));

    // Modal buttons
    statsBtn.addEventListener('click', () => openStatsModal());
    settingsBtn.addEventListener('click', () => openModal(settingsModal));

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            closeModal(e.target.closest('.modal'));
        });
    });

    // Settings
    document.getElementById('reset-progress').addEventListener('click', resetProgress);
    document.getElementById('change-level-btn').addEventListener('click', changeLevel);

    // Review Button
    document.addEventListener('click', (e) => {
        if (e.target.id === 'review-unknown-btn') {
            startReview();
        }
    });
}

function startGame(level) {
    currentLevel = level;

    // Load dictionary for selected level
    dictionary = level === 'level1' ? level1Data : level2Data;

    // Load progress for this level
    knownWords = JSON.parse(localStorage.getItem(`${level}_knownWords`)) || [];
    unknownWords = JSON.parse(localStorage.getItem(`${level}_unknownWords`)) || [];

    // Generate word list from dictionary keys
    activeWords = Object.keys(dictionary).filter(word =>
        !knownWords.includes(word) && !unknownWords.includes(word)
    );

    currentIndex = 0;

    // Hide level selection modal
    levelSelectionModal.classList.add('hidden');

    // Start game
    if (activeWords.length > 0) {
        renderCard(activeWords[currentIndex]);
    } else {
        showCompletionState();
    }
}

function saveProgress() {
    localStorage.setItem(`${currentLevel}_knownWords`, JSON.stringify(knownWords));
    localStorage.setItem(`${currentLevel}_unknownWords`, JSON.stringify(unknownWords));
}

function renderCard(word) {
    if (!word) return;

    const data = dictionary[word] || { zh: '...', ipa: '', en: '' };
    // Use English definition in prompt for better accuracy
    const prompt = `${word} ${data.en} fantasy art illustration magic the gathering style`;
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=400&height=300&nologo=true`;

    // Calculate progress
    const totalWords = Object.keys(dictionary).length;
    const currentProgress = knownWords.length + unknownWords.length + 1; // +1 for current word being shown

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
                            "${data.en || 'The meaning of this word is ancient and powerful.'}"
                        </div>
                    </div>
                </div>
            </div>
            <!-- Bottom Info (Outside Frame) -->
            <div class="mtg-bottom-info">
                <span>${currentProgress}/${totalWords}</span>
                <span>™ & © 2025 MAGIC-WORD</span>
            </div>
        </div>
    `;

    cardContainer.innerHTML = cardHtml;

    // Preload next image
    if (activeWords.length > 1) {
        const nextWord = activeWords[1];
        const nextData = dictionary[nextWord] || { en: '' };
        const nextPrompt = `${nextWord} ${nextData.en} fantasy art illustration magic the gathering style`;
        const nextImg = new Image();
        nextImg.src = `https://image.pollinations.ai/prompt/${encodeURIComponent(nextPrompt)}?width=400&height=300&nologo=true`;
    }
}

function markWord(type) {
    const word = activeWords[currentIndex];

    if (type === 'known') {
        knownWords.push(word);
    } else {
        unknownWords.push(word);
    }

    saveProgress();

    // Remove from active list
    activeWords.splice(currentIndex, 1);

    if (activeWords.length > 0) {
        // Adjust index if needed
        if (currentIndex >= activeWords.length) {
            currentIndex = 0;
        }
        renderCard(activeWords[currentIndex]);
    } else {
        showCompletionState();
    }
}

function showCompletionState() {
    const hasUnknown = unknownWords.length > 0;
    const message = hasUnknown
        ? `You have ${unknownWords.length} words to review.`
        : "You've mastered all the words!";

    const reviewBtn = hasUnknown
        ? '<button id="review-unknown-btn" class="level-btn" style="margin: 20px auto; max-width: 300px;">Review Unknown Words</button>'
        : '';

    cardContainer.innerHTML = `
        <div class="loading-state">
            <span class="material-icons-round" style="font-size: 48px; color: #51cf66;">check_circle</span>
            <h2 style="margin-top: 16px;">Completed!</h2>
            <p>${message}</p>
            ${reviewBtn}
        </div>
    `;
}

function startReview() {
    if (unknownWords.length === 0) return;

    // Shuffle unknown words
    activeWords = [...unknownWords].sort(() => Math.random() - 0.5);
    unknownWords = [];
    currentIndex = 0;
    saveProgress();
    renderCard(activeWords[currentIndex]);
}

function speakWord(word) {
    if (!word) return;

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoices = [
        'Google US English',
        'Samantha',
        'Alex',
        'Microsoft Zira - English (United States)'
    ];

    for (const preferred of preferredVoices) {
        const voice = voices.find(v => v.name.includes(preferred));
        if (voice) {
            utterance.voice = voice;
            break;
        }
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

function openStatsModal() {
    updateStats();
    openModal(statsModal);
}

function updateStats() {
    document.getElementById('known-count').textContent = knownWords.length;
    document.getElementById('unknown-count').textContent = unknownWords.length;

    const unknownList = document.getElementById('unknown-list');
    if (unknownWords.length === 0) {
        unknownList.innerHTML = '<li style="opacity: 0.5;">No words yet</li>';
    } else {
        unknownList.innerHTML = unknownWords.map(word =>
            `<li>${word} <span style="opacity: 0.7;">${dictionary[word]?.zh || ''}</span></li>`
        ).join('');
    }
}

function openModal(modal) {
    modal.classList.remove('hidden');
}

function closeModal(modal) {
    modal.classList.add('hidden');
}

function resetProgress() {
    if (confirm('Are you sure you want to reset your progress for this level?')) {
        localStorage.removeItem(`${currentLevel}_knownWords`);
        localStorage.removeItem(`${currentLevel}_unknownWords`);
        closeModal(settingsModal);
        startGame(currentLevel);
    }
}

function changeLevel() {
    closeModal(settingsModal);
    showLevelSelection();
}

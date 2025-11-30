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
let isReviewMode = false; // Track if we're in review mode
let reviewTotal = 0; // Total words in current review session

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
    // Check if there are any unknown words to review
    const level1Unknown = JSON.parse(localStorage.getItem('level1_unknownWords')) || [];
    const level2Unknown = JSON.parse(localStorage.getItem('level2_unknownWords')) || [];
    const hasUnknown = level1Unknown.length > 0 || level2Unknown.length > 0;

    const globalReviewBtn = document.getElementById('global-review-btn');
    if (globalReviewBtn) {
        globalReviewBtn.style.display = hasUnknown ? 'flex' : 'none';
    }

    levelSelectionModal.classList.remove('hidden');
}

function setupEventListeners() {
    // Level selection
    document.querySelectorAll('.level-btn[data-level]').forEach(btn => {
        btn.addEventListener('click', () => {
            const level = btn.dataset.level;
            startGame(level);
        });
    });

    document.getElementById('global-review-btn').addEventListener('click', startGlobalReview);

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
    isReviewMode = false; // Reset review mode

    // Hide level selection modal
    levelSelectionModal.classList.add('hidden');

    // Check if level is already completed
    if (activeWords.length === 0 && (knownWords.length > 0 || unknownWords.length > 0)) {
        // Level is completed (or fully in review)
        if (confirm(`You have already completed ${level === 'level1' ? 'Level 1' : 'Level 2'}. Do you want to restart from the beginning?`)) {
            // Reset progress for this level
            localStorage.removeItem(`${level}_knownWords`);
            localStorage.removeItem(`${level}_unknownWords`);
            knownWords = [];
            unknownWords = [];
            activeWords = Object.keys(dictionary);
        }
    }

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

    // Enable action buttons
    knownBtn.disabled = false;
    unknownBtn.disabled = false;
    speakBtn.disabled = false;

    const data = dictionary[word] || { zh: '...', ipa: '', en: '' };
    // Use English definition in prompt for better accuracy
    const prompt = `${word} ${data.en} fantasy art illustration magic the gathering style`;
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=400&height=300&nologo=true`;

    // Calculate progress
    let progressText = '';
    if (isReviewMode) {
        // In review mode: show progress within the review session
        // activeWords shrinks as we go, so current number is (Total - Remaining + 1)
        const current = reviewTotal - activeWords.length + 1;
        progressText = `${current}/${reviewTotal}`;
    } else {
        // Normal mode
        const totalWords = Object.keys(dictionary).length;
        const currentProgress = knownWords.length + unknownWords.length + 1;
        progressText = `${currentProgress}/${totalWords}`;
    }

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
                <span>${progressText}</span>
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

    if (isReviewMode) {
        // In review mode
        if (type === 'known') {
            // Remove from unknown list and add to known list
            const index = unknownWords.indexOf(word);
            if (index > -1) {
                unknownWords.splice(index, 1);
            }
            if (!knownWords.includes(word)) {
                knownWords.push(word);
            }
        }
        // If marked as "unknown" again, keep it in unknownWords (do nothing)

        if (currentLevel === 'global_review') {
            // In global review, we need to update the specific level storage
            updateLevelStorage(word, type);
        } else {
            saveProgress();
        }

        // Remove from active review list
        activeWords.splice(currentIndex, 1);

        if (activeWords.length > 0) {
            if (currentIndex >= activeWords.length) {
                currentIndex = 0;
            }
            renderCard(activeWords[currentIndex]);
        } else {
            // Review session complete
            isReviewMode = false;
            showReviewComplete();
        }
    } else {
        // Normal learning mode
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
}

function showCompletionState() {
    const hasUnknown = unknownWords.length > 0;
    const message = hasUnknown
        ? `You have ${unknownWords.length} words to review.`
        : "You've mastered all the words!";

    const reviewBtn = hasUnknown
        ? '<button id="review-unknown-btn" class="level-btn" style="margin: 20px auto; max-width: 300px;">Review Unknown Words</button>'
        : '';

    // Disable action buttons
    knownBtn.disabled = true;
    unknownBtn.disabled = true;
    speakBtn.disabled = true;

    cardContainer.innerHTML = `
        <div class="loading-state">
            <span class="material-icons-round" style="font-size: 48px; color: #51cf66;">check_circle</span>
            <h2 style="margin-top: 16px;">Completed!</h2>
            <p>${message}</p>
            ${reviewBtn}
            <button onclick="location.reload()" class="level-btn" style="margin: 10px auto; max-width: 300px; background: #f0f0f0;">Back to Menu</button>
            <button id="restart-level-btn" class="level-btn" style="margin: 10px auto; max-width: 300px; background: #ffe3e3; border-color: #ff6b6b; color: #c92a2a;">Restart Level</button>
        </div>
    `;

    // Bind restart button
    document.getElementById('restart-level-btn')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to restart this level? All progress will be lost.')) {
            localStorage.removeItem(`${currentLevel}_knownWords`);
            localStorage.removeItem(`${currentLevel}_unknownWords`);
            startGame(currentLevel);
        }
    });
}

function showReviewComplete() {
    const stillHasUnknown = unknownWords.length > 0;
    const message = stillHasUnknown
        ? `Great! You still have ${unknownWords.length} words to review.`
        : "Excellent! You've learned all the unknown words!";

    const reviewBtn = stillHasUnknown
        ? '<button id="review-unknown-btn" class="level-btn" style="margin: 20px auto; max-width: 300px;">Review Again</button>'
        : '';

    // Disable action buttons
    knownBtn.disabled = true;
    unknownBtn.disabled = true;
    speakBtn.disabled = true;

    cardContainer.innerHTML = `
        <div class="loading-state">
            <span class="material-icons-round" style="font-size: 48px; color: #4dabf7;">restart_alt</span>
            <h2 style="margin-top: 16px;">Review Complete!</h2>
            <p>${message}</p>
            ${reviewBtn}
            <button onclick="location.reload()" class="level-btn" style="margin: 10px auto; max-width: 300px; background: #f0f0f0;">Back to Menu</button>
            <button id="restart-level-btn-review" class="level-btn" style="margin: 10px auto; max-width: 300px; background: #ffe3e3; border-color: #ff6b6b; color: #c92a2a;">Restart Level</button>
        </div>
    `;

    // Bind restart button
    document.getElementById('restart-level-btn-review')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to restart this level? All progress will be lost.')) {
            localStorage.removeItem(`${currentLevel}_knownWords`);
            localStorage.removeItem(`${currentLevel}_unknownWords`);
            startGame(currentLevel);
        }
    });
}

function startReview() {
    if (unknownWords.length === 0) return;

    // Shuffle unknown words for practice (but don't clear the unknownWords list)
    activeWords = [...unknownWords].sort(() => Math.random() - 0.5);
    currentIndex = 0;

    // Set flag to indicate we're in review mode
    isReviewMode = true;
    reviewTotal = activeWords.length;

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

function updateLevelStorage(word, type) {
    // Determine which level the word belongs to
    let level = null;
    if (level1Data[word]) level = 'level1';
    else if (level2Data[word]) level = 'level2';

    if (!level) return;

    let lvlKnown = JSON.parse(localStorage.getItem(`${level}_knownWords`)) || [];
    let lvlUnknown = JSON.parse(localStorage.getItem(`${level}_unknownWords`)) || [];

    if (type === 'known') {
        // Remove from unknown, add to known
        lvlUnknown = lvlUnknown.filter(w => w !== word);
        if (!lvlKnown.includes(word)) lvlKnown.push(word);
    } else {
        // Keep in unknown (ensure it's there)
        if (!lvlUnknown.includes(word)) lvlUnknown.push(word);
        // Ensure not in known
        lvlKnown = lvlKnown.filter(w => w !== word);
    }

    localStorage.setItem(`${level}_knownWords`, JSON.stringify(lvlKnown));
    localStorage.setItem(`${level}_unknownWords`, JSON.stringify(lvlUnknown));
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

function startGlobalReview() {
    // Load unknown words from all levels
    const level1Unknown = JSON.parse(localStorage.getItem('level1_unknownWords')) || [];
    const level2Unknown = JSON.parse(localStorage.getItem('level2_unknownWords')) || [];

    if (level1Unknown.length === 0 && level2Unknown.length === 0) {
        alert("You don't have any unknown words to review yet!");
        return;
    }

    // Combine dictionaries
    dictionary = { ...level1Data, ...level2Data };

    // Combine unknown words
    unknownWords = [...level1Unknown, ...level2Unknown];

    // Set a special level ID for global review
    currentLevel = 'global_review';

    // Shuffle
    activeWords = [...unknownWords].sort(() => Math.random() - 0.5);

    // Reset unknownWords to empty so we can track what is STILL unknown in this session
    // Wait, actually we want to keep them in their respective level storages
    // But for this session, we treat them as the active list.

    // We need to know which level a word belongs to when saving progress
    // But since we merged dictionaries, we can just look up the word.
    // However, saving back to specific level storage is tricky if we don't track origin.
    // Simplification: Just save to both? Or check which dictionary it's in.

    currentIndex = 0;
    isReviewMode = true;
    reviewTotal = activeWords.length;

    // Hide modal
    levelSelectionModal.classList.add('hidden');

    renderCard(activeWords[currentIndex]);
}

        'use strict';

        // ============================================
        // GRADE SELECTION INTEGRATION
        // ============================================
        // 選択された学年を取得
        const SELECTED_GRADE = parseInt(localStorage.getItem('selectedGrade')) || 1;
        const CURRENT_CURRICULUM = GRADE_CURRICULUMS[SELECTED_GRADE];

        // 学年別の問題テンプレートとスキルカテゴリーを設定
        const QUESTION_TEMPLATES = CURRENT_CURRICULUM.templates;
        let SKILL_CATEGORIES = JSON.parse(JSON.stringify(CURRENT_CURRICULUM.categories));

        // Debug logging
        console.log('[DEBUG] Selected Grade:', SELECTED_GRADE);
        console.log('[DEBUG] Curriculum:', CURRENT_CURRICULUM.name);
        console.log('[DEBUG] Question templates count:', QUESTION_TEMPLATES.length);
        console.log('[DEBUG] Question types:', QUESTION_TEMPLATES.map(t => t.type));
        console.log('[DEBUG] Skill categories:', Object.keys(SKILL_CATEGORIES));

        // ============================================
        // OPTIMIZED GLOBAL STATE
        // ============================================
        const STATE = {
            scene: null,
            camera: null,
            renderer: null,
            hands: null,
            videoElement: null,
            handsData: [],
            audioContext: null,
            audioBuffers: {},

            // Player
            player: { score: 0, streak: 0, accuracy: 0, shots: 0, hits: 0, bestStreak: 0 },

            // Game state
            timeLeft: 60,
            questionIndex: 0,
            currentQuestion: null,
            difficultyLevel: 1,

            // OPTIMIZED: Pre-allocated pools
            targetPool: [],
            particlePool: [],
            targets: [],
            particles: [],

            // OPTIMIZED: Dual crosshairs for two hands
            crosshairs: [null, null],
            crosshairTargetPos: [
                { x: 0, y: 0, z: -8 },
                { x: 0, y: 0, z: -8 }
            ],
            crosshairCurrentPos: [
                { x: 0, y: 0, z: -8 },
                { x: 0, y: 0, z: -8 }
            ],

            // Hand states for both hands
            handStates: [
                { state: 'idle', cooldownEnd: 0 },
                { state: 'idle', cooldownEnd: 0 }
            ],

            // Timing
            gameStartTime: 0,
            lastRenderTime: 0,
            lastDetectionTime: 0,

            // Flags
            isRunning: false,
            isPaused: false,
            modelReady: false,
            audioReady: false,

            // OPTIMIZED: Texture cache
            textureCache: new Map(),

            // OPTIMIZED: Material cache
            materials: {},

            // Best scores
            bestScores: []
        };

        // ============================================
        // CONFIGURATION
        // ============================================
        const CONFIG = {
            GESTURE: {
                EXTEND_THRESHOLD: 0.08,
                CURL_THRESHOLD: 0.05,
                COOLDOWN_MS: 350
            },
            MAX_TARGETS: 5,
            TARGET_POOL_SIZE: 10,
            PARTICLE_POOL_SIZE: 60,
            QUESTIONS_PER_STAGE: 8,  // Questions per stage
            TIME_LIMIT: 90,  // More time per stage
            SCORE_CORRECT: 100,
            SCORE_SMART: 50,
            PENALTY_WRONG: 50,
            CROSSHAIR_LERP: 0.35,
            DETECTION_FPS: 25
        };

        // ============================================
        // STAGE & EVENT SYSTEM
        // ============================================
        const WORLDS = [
            { name: '🌲 森の世界', color: 0x228B22, stages: 3, unlockScore: 0 },
            { name: '🌊 海の世界', color: 0x1E90FF, stages: 3, unlockScore: 500 },
            { name: '🏜️ 砂漠の世界', color: 0xDEB887, stages: 3, unlockScore: 1500 },
            { name: '🌙 夜空の世界', color: 0x191970, stages: 3, unlockScore: 3000 },
            { name: '🔥 炎の世界', color: 0xFF4500, stages: 3, unlockScore: 5000 },
            { name: '⭐ 宇宙の世界', color: 0x4B0082, stages: 4, unlockScore: 8000 },
            { name: '🏆 チャンピオン', color: 0xFFD700, stages: 5, unlockScore: 12000 }
        ];

        const EVENTS = {
            NORMAL: 'normal',
            BONUS: 'bonus',        // All golden targets, 2x points
            SPEED: 'speed',        // Fast balloons, 1.5x points
            BOSS: 'boss',          // Big boss balloon
            FRENZY: 'frenzy',      // Many small targets
            GOLDEN: 'golden'       // One golden target worth 500pts
        };

        // Stage state
        let currentWorld = 0;
        let currentStage = 1;
        let currentEvent = EVENTS.NORMAL;
        let totalScore = 0;  // Accumulated across all stages
        let stagesCompleted = 0;
        let bossHealth = 0;
        let eventTimer = 0;

        // ============================================
        // ADAPTIVE SKILL SYSTEM
        // ============================================
        // SKILL_CATEGORIESは学年選択時に初期化済み（ファイルの先頭を参照）

        // Update skill after answering
        function updateSkill(questionType, isCorrect) {
            const cat = getCategory(questionType);
            const skill = SKILL_CATEGORIES[cat];
            skill.total++;
            if (isCorrect) skill.correct++;

            // Adjust level based on recent performance (every 3 questions)
            if (skill.total % 3 === 0) {
                const recentRate = skill.correct / skill.total;
                if (recentRate >= 0.8 && skill.level < 10) {
                    skill.level++;
                    showFeedback(`📈 ${cat} Level UP!`, '#00ff00');
                } else if (recentRate < 0.4 && skill.level > 1) {
                    skill.level--;
                }
                // Reset counters for fresh tracking
                skill.correct = 0;
                skill.total = 0;
            }

            // Save to localStorage
            try {
                localStorage.setItem('mathSkills', JSON.stringify(SKILL_CATEGORIES));
            } catch (e) {}
        }

        // Load saved skills
        function loadSkills() {
            try {
                const saved = localStorage.getItem('mathSkills');
                if (saved) {
                    const data = JSON.parse(saved);
                    Object.keys(data).forEach(cat => {
                        if (SKILL_CATEGORIES[cat]) {
                            SKILL_CATEGORIES[cat].level = data[cat].level || 1;
                        }
                    });
                }
            } catch (e) {}
        }

        // ============================================
        // MATH QUESTION GENERATOR (ADAPTIVE)
        // ============================================
        // QUESTION_TEMPLATESは学年選択時に初期化済み（ファイルの先頭を参照）
        // questions.jsのGRADE_CURRICULUMS[SELECTED_GRADE].templatesから読み込まれる

        function generateQuestion() {
            // Pick a random category, then select question based on skill level
            const categories = Object.keys(SKILL_CATEGORIES);
            const category = categories[Math.floor(Math.random() * categories.length)];
            const skillLevel = SKILL_CATEGORIES[category].level;

            // Find questions matching this category and appropriate skill level
            // Allow questions within ±2 of player's skill level
            let available = QUESTION_TEMPLATES.filter(t =>
                t.category === category &&
                t.skillLevel <= skillLevel + 1 &&
                t.skillLevel >= Math.max(1, skillLevel - 2)
            );

            // Fallback: if no matching questions, use any question at appropriate level
            if (available.length === 0) {
                available = QUESTION_TEMPLATES.filter(t =>
                    t.skillLevel <= Math.max(...Object.values(SKILL_CATEGORIES).map(s => s.level)) + 1
                );
            }

            // Prefer questions at or slightly above skill level (challenge!)
            const weighted = available.flatMap(t => {
                if (t.skillLevel === skillLevel) return [t, t, t];  // 3x weight for matching
                if (t.skillLevel === skillLevel + 1) return [t, t]; // 2x weight for challenge
                return [t];
            });

            const template = weighted[Math.floor(Math.random() * weighted.length)];
            const q = template.generate();
            q.questionType = template.type;  // Track type for skill update

            // Debug logging for generated question
            console.log('[DEBUG] Generated question:', {
                type: q.questionType,
                question: q.question,
                answer: q.answer,
                category: template.category,
                skillLevel: template.skillLevel
            });

            const distractors = new Set();

            // Adaptive distractor range based on answer size
            const answerMagnitude = Math.max(10, Math.abs(q.answer));
            const offsetRange = answerMagnitude < 100 ? 5 : answerMagnitude < 500 ? 50 : 200;

            let attempts = 0;
            while (distractors.size < 3 && attempts < 20) {
                attempts++;
                let d;
                if (q.answer >= 1000) {
                    // For large numbers (unit conversions), use multiples
                    const mult = [100, 500, 1000, 1500, 2000, 2500, 3000, 4000, 5000];
                    d = mult[Math.floor(Math.random() * mult.length)];
                } else if (q.answer >= 100) {
                    // Medium numbers
                    const offset = (Math.floor(Math.random() * 5) - 2) * 100;
                    d = Math.max(100, q.answer + offset);
                } else {
                    // Small numbers
                    const offset = Math.floor(Math.random() * 10) - 5;
                    d = Math.max(0, q.answer + offset);
                }
                if (d !== q.answer && !q.strategy.includes(d) && d > 0) {
                    distractors.add(d);
                }
            }

            // Ensure answer is always first, then add strategy and distractors
            const allNumbers = [q.answer, ...q.strategy, ...Array.from(distractors)];
            const uniqueNumbers = [...new Set(allNumbers)].slice(0, CONFIG.MAX_TARGETS);

            // Double-check: if answer somehow got removed, force it back at the start
            if (!uniqueNumbers.includes(q.answer)) {
                uniqueNumbers[0] = q.answer;  // Replace first element with answer
            }

            return { ...q, allNumbers: uniqueNumbers };
        }

        // ============================================
        // AUDIO SYSTEM (ENHANCED - REALISTIC SOUNDS)
        // ============================================
        async function initAudio() {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                STATE.audioContext = new AudioContext();
                STATE.audioReady = true;
                console.log('[Audio] Context created, state:', STATE.audioContext.state);
            } catch (e) {
                console.warn('Audio init failed:', e);
            }
        }

        // Unlock audio on user interaction (required by browsers)
        async function unlockAudio() {
            if (!STATE.audioContext) {
                await initAudio();
            }
            if (STATE.audioContext && STATE.audioContext.state === 'suspended') {
                try {
                    await STATE.audioContext.resume();
                    console.log('[Audio] Context resumed, state:', STATE.audioContext.state);
                    // Play a silent sound to fully unlock
                    const buffer = STATE.audioContext.createBuffer(1, 1, 22050);
                    const source = STATE.audioContext.createBufferSource();
                    source.buffer = buffer;
                    source.connect(STATE.audioContext.destination);
                    source.start(0);
                } catch (e) {
                    console.warn('[Audio] Resume failed:', e);
                }
            }
        }

        // Add unlock listeners for various user interactions
        function setupAudioUnlock() {
            const unlockEvents = ['click', 'touchstart', 'touchend', 'keydown'];
            const unlockHandler = () => {
                unlockAudio();
                // Remove listeners after first interaction
                unlockEvents.forEach(event => {
                    document.removeEventListener(event, unlockHandler);
                });
            };
            unlockEvents.forEach(event => {
                document.addEventListener(event, unlockHandler, { passive: true });
            });
        }

        // Create noise buffer for explosion sounds
        function createNoiseBuffer(duration) {
            if (!STATE.audioContext) return null;
            const sampleRate = STATE.audioContext.sampleRate;
            const length = sampleRate * duration;
            const buffer = STATE.audioContext.createBuffer(1, length, sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.3));
            }
            return buffer;
        }

        // Ensure audio is ready before playing
        async function ensureAudioReady() {
            if (!STATE.audioContext) {
                await initAudio();
            }
            if (STATE.audioContext && STATE.audioContext.state === 'suspended') {
                try {
                    await STATE.audioContext.resume();
                    console.log('[Audio] Resumed context for playback');
                } catch (e) {
                    console.warn('[Audio] Failed to resume:', e);
                }
            }
            return STATE.audioContext && STATE.audioContext.state === 'running';
        }

        // Realistic gun shot sound
        function playShootSound() {
            if (!STATE.audioContext) return;

            const now = STATE.audioContext.currentTime;

            // Attack transient (click)
            const clickOsc = STATE.audioContext.createOscillator();
            const clickGain = STATE.audioContext.createGain();
            clickOsc.connect(clickGain);
            clickGain.connect(STATE.audioContext.destination);
            clickOsc.frequency.setValueAtTime(1200, now);
            clickOsc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
            clickOsc.type = 'square';
            clickGain.gain.setValueAtTime(0.3, now);
            clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            clickOsc.start(now);
            clickOsc.stop(now + 0.05);

            // Low thump
            const thumpOsc = STATE.audioContext.createOscillator();
            const thumpGain = STATE.audioContext.createGain();
            thumpOsc.connect(thumpGain);
            thumpGain.connect(STATE.audioContext.destination);
            thumpOsc.frequency.setValueAtTime(150, now);
            thumpOsc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
            thumpOsc.type = 'sine';
            thumpGain.gain.setValueAtTime(0.4, now);
            thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            thumpOsc.start(now);
            thumpOsc.stop(now + 0.1);

            // Noise burst
            const noiseBuffer = createNoiseBuffer(0.08);
            if (noiseBuffer) {
                const noiseSource = STATE.audioContext.createBufferSource();
                const noiseGain = STATE.audioContext.createGain();
                const noiseFilter = STATE.audioContext.createBiquadFilter();
                noiseSource.buffer = noiseBuffer;
                noiseSource.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(STATE.audioContext.destination);
                noiseFilter.type = 'highpass';
                noiseFilter.frequency.value = 1000;
                noiseGain.gain.setValueAtTime(0.2, now);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                noiseSource.start(now);
            }
        }

        // Explosion sound (balloon pop)
        function playExplosionSound(isCorrect) {
            if (!STATE.audioContext) return;

            const now = STATE.audioContext.currentTime;

            // Pop sound
            const popOsc = STATE.audioContext.createOscillator();
            const popGain = STATE.audioContext.createGain();
            popOsc.connect(popGain);
            popGain.connect(STATE.audioContext.destination);
            popOsc.frequency.setValueAtTime(isCorrect ? 800 : 400, now);
            popOsc.frequency.exponentialRampToValueAtTime(isCorrect ? 200 : 100, now + 0.15);
            popOsc.type = 'sine';
            popGain.gain.setValueAtTime(0.3, now);
            popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            popOsc.start(now);
            popOsc.stop(now + 0.15);

            // Noise burst for pop texture
            const noiseBuffer = createNoiseBuffer(0.1);
            if (noiseBuffer) {
                const noiseSource = STATE.audioContext.createBufferSource();
                const noiseGain = STATE.audioContext.createGain();
                const noiseFilter = STATE.audioContext.createBiquadFilter();
                noiseSource.buffer = noiseBuffer;
                noiseSource.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(STATE.audioContext.destination);
                noiseFilter.type = 'bandpass';
                noiseFilter.frequency.value = isCorrect ? 2000 : 800;
                noiseFilter.Q.value = 1;
                noiseGain.gain.setValueAtTime(0.15, now);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                noiseSource.start(now);
            }
        }

        // Correct answer celebration sound
        function playCorrectSound() {
            if (!STATE.audioContext) return;

            const now = STATE.audioContext.currentTime;
            const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

            notes.forEach((freq, i) => {
                const osc = STATE.audioContext.createOscillator();
                const gain = STATE.audioContext.createGain();
                osc.connect(gain);
                gain.connect(STATE.audioContext.destination);
                osc.frequency.value = freq;
                osc.type = 'sine';
                const startTime = now + i * 0.08;
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
                osc.start(startTime);
                osc.stop(startTime + 0.2);
            });
        }

        // Smart hit sound (golden)
        function playSmartSound() {
            if (!STATE.audioContext) return;

            const now = STATE.audioContext.currentTime;
            const notes = [659, 784, 880]; // E5, G5, A5

            notes.forEach((freq, i) => {
                const osc = STATE.audioContext.createOscillator();
                const gain = STATE.audioContext.createGain();
                osc.connect(gain);
                gain.connect(STATE.audioContext.destination);
                osc.frequency.value = freq;
                osc.type = 'triangle';
                const startTime = now + i * 0.06;
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
                osc.start(startTime);
                osc.stop(startTime + 0.25);
            });

            // Sparkle effect
            for (let i = 0; i < 5; i++) {
                const sparkle = STATE.audioContext.createOscillator();
                const sparkleGain = STATE.audioContext.createGain();
                sparkle.connect(sparkleGain);
                sparkleGain.connect(STATE.audioContext.destination);
                sparkle.frequency.value = 2000 + Math.random() * 2000;
                sparkle.type = 'sine';
                const startTime = now + 0.1 + i * 0.04;
                sparkleGain.gain.setValueAtTime(0.03, startTime);
                sparkleGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);
                sparkle.start(startTime);
                sparkle.stop(startTime + 0.08);
            }
        }

        // Wrong answer sound
        function playWrongSound() {
            if (!STATE.audioContext) return;

            const now = STATE.audioContext.currentTime;

            // Descending tone
            const osc = STATE.audioContext.createOscillator();
            const gain = STATE.audioContext.createGain();
            osc.connect(gain);
            gain.connect(STATE.audioContext.destination);
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(150, now + 0.3);
            osc.type = 'sawtooth';
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);

            // Buzz
            const buzz = STATE.audioContext.createOscillator();
            const buzzGain = STATE.audioContext.createGain();
            buzz.connect(buzzGain);
            buzzGain.connect(STATE.audioContext.destination);
            buzz.frequency.value = 80;
            buzz.type = 'square';
            buzzGain.gain.setValueAtTime(0.1, now);
            buzzGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            buzz.start(now);
            buzz.stop(now + 0.2);
        }

        // Miss sound (whoosh)
        function playMissSound() {
            if (!STATE.audioContext) return;

            const now = STATE.audioContext.currentTime;

            // Whoosh noise
            const noiseBuffer = createNoiseBuffer(0.15);
            if (noiseBuffer) {
                const noiseSource = STATE.audioContext.createBufferSource();
                const noiseGain = STATE.audioContext.createGain();
                const noiseFilter = STATE.audioContext.createBiquadFilter();
                noiseSource.buffer = noiseBuffer;
                noiseSource.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(STATE.audioContext.destination);
                noiseFilter.type = 'bandpass';
                noiseFilter.frequency.setValueAtTime(2000, now);
                noiseFilter.frequency.linearRampToValueAtTime(500, now + 0.15);
                noiseFilter.Q.value = 2;
                noiseGain.gain.setValueAtTime(0.08, now);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                noiseSource.start(now);
            }
        }

        // Combo sound (increasing excitement)
        function playComboSound(streak) {
            if (!STATE.audioContext) return;
            if (streak < 2) return;

            const now = STATE.audioContext.currentTime;
            const baseFreq = 400 + streak * 50;

            // Ascending arpeggio
            for (let i = 0; i < Math.min(streak, 5); i++) {
                const osc = STATE.audioContext.createOscillator();
                const gain = STATE.audioContext.createGain();
                osc.connect(gain);
                gain.connect(STATE.audioContext.destination);
                osc.frequency.value = baseFreq * (1 + i * 0.25);
                osc.type = 'sine';
                const startTime = now + i * 0.04;
                gain.gain.setValueAtTime(0.08, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
                osc.start(startTime);
                osc.stop(startTime + 0.15);
            }

            // Big combo bonus sound
            if (streak >= 5) {
                const chord = [523, 659, 784, 1047];
                chord.forEach(freq => {
                    const osc = STATE.audioContext.createOscillator();
                    const gain = STATE.audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(STATE.audioContext.destination);
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0.05, now + 0.2);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                    osc.start(now + 0.2);
                    osc.stop(now + 0.6);
                });
            }
        }

        // Level up fanfare
        function playLevelUpSound() {
            if (!STATE.audioContext) return;

            const now = STATE.audioContext.currentTime;
            const notes = [523, 659, 784, 1047, 1319]; // C5, E5, G5, C6, E6

            notes.forEach((freq, i) => {
                const osc = STATE.audioContext.createOscillator();
                const gain = STATE.audioContext.createGain();
                osc.connect(gain);
                gain.connect(STATE.audioContext.destination);
                osc.frequency.value = freq;
                osc.type = 'sine';
                const startTime = now + i * 0.1;
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.2, startTime + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
                osc.start(startTime);
                osc.stop(startTime + 0.4);
            });

            // Shimmer effect
            for (let i = 0; i < 10; i++) {
                const shimmer = STATE.audioContext.createOscillator();
                const shimmerGain = STATE.audioContext.createGain();
                shimmer.connect(shimmerGain);
                shimmerGain.connect(STATE.audioContext.destination);
                shimmer.frequency.value = 1500 + Math.random() * 2000;
                shimmer.type = 'sine';
                const startTime = now + 0.3 + i * 0.03;
                shimmerGain.gain.setValueAtTime(0.02, startTime);
                shimmerGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
                shimmer.start(startTime);
                shimmer.stop(startTime + 0.1);
            }
        }

        // Legacy playSFX wrapper for compatibility - iOS ENHANCED
        let audioUnlocked = false;

        function unlockAudioForIOS() {
            if (!STATE.audioContext) return;

            // Play a silent buffer to unlock iOS audio
            try {
                const buffer = STATE.audioContext.createBuffer(1, 1, 22050);
                const source = STATE.audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(STATE.audioContext.destination);
                source.start(0);
                audioUnlocked = true;
                console.log('[Audio] iOS unlock buffer played');
            } catch (e) {
                console.warn('[Audio] iOS unlock failed:', e);
            }
        }

        function playSFX(type) {
            // Create audio context synchronously within user gesture
            if (!STATE.audioContext) {
                try {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    STATE.audioContext = new AudioContext();
                    STATE.audioReady = true;
                    console.log('[Audio] Created context, state:', STATE.audioContext.state);

                    // Immediately unlock for iOS
                    unlockAudioForIOS();
                } catch (e) {
                    console.warn('[Audio] Failed to create context:', e);
                    return;
                }
            }

            // Resume if suspended (iOS requirement)
            if (STATE.audioContext.state === 'suspended') {
                STATE.audioContext.resume().then(() => {
                    console.log('[Audio] Resumed, state:', STATE.audioContext.state);
                    if (!audioUnlocked) {
                        unlockAudioForIOS();
                    }
                    // Play the sound after resume completes
                    playSound(type);
                });
                return;  // Don't play yet, wait for resume
            }

            // Context is running, play immediately
            playSound(type);
        }

        function playSound(type) {
            if (!STATE.audioContext || STATE.audioContext.state !== 'running') return;

            switch(type) {
                case 'shoot':
                    playShootSound();
                    break;
                case 'correct':
                    playExplosionSound(true);
                    playCorrectSound();
                    break;
                case 'smart':
                    playExplosionSound(true);
                    playSmartSound();
                    break;
                case 'wrong':
                    playExplosionSound(false);
                    playWrongSound();
                    break;
                case 'miss':
                    playMissSound();
                    break;
                case 'combo':
                    playComboSound(STATE.player.streak);
                    break;
                case 'levelup':
                    playLevelUpSound();
                    break;
            }
        }

        // ============================================
        // TEXTURE CACHE (MAJOR OPTIMIZATION)
        // ============================================
        function getNumberTexture(number) {
            const key = String(number);
            if (STATE.textureCache.has(key)) {
                return STATE.textureCache.get(key);
            }

            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');

            // Clear background (transparent)
            ctx.clearRect(0, 0, 256, 256);

            // Draw text with shadow for visibility
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 140px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(key, 128, 128);

            // Draw outline for extra visibility
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            ctx.strokeText(key, 128, 128);

            const texture = new THREE.CanvasTexture(canvas);
            texture.minFilter = THREE.LinearFilter;
            STATE.textureCache.set(key, texture);

            return texture;
        }

        // Pre-generate common number textures
        function preloadTextures() {
            for (let i = 0; i <= 100; i++) {
                getNumberTexture(i);
            }
        }

        // ============================================
        // THREE.JS SCENE SETUP (OPTIMIZED)
        // ============================================
        function initThreeJS() {
            console.log('[Three.js] Initializing...');
            const canvas = document.getElementById('gameCanvas');
            if (!canvas) {
                throw new Error('Canvas element not found');
            }

            STATE.scene = new THREE.Scene();
            STATE.scene.background = new THREE.Color(0x0a0a1a);
            console.log('[Three.js] Scene created');

            STATE.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
            STATE.camera.position.set(0, 2, 15);
            STATE.camera.lookAt(0, 0, 0);

            STATE.renderer = new THREE.WebGLRenderer({
                canvas,
                antialias: false,
                powerPreference: 'high-performance',
                stencil: false,
                depth: true
            });
            STATE.renderer.setSize(window.innerWidth, window.innerHeight);
            STATE.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

            // Simplified lighting
            STATE.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
            const light = new THREE.PointLight(0x667eea, 0.5, 50);
            light.position.set(0, 10, 10);
            STATE.scene.add(light);

            // Grid
            const grid = new THREE.GridHelper(40, 20, 0x667eea, 0x222233);
            grid.position.y = -6;
            STATE.scene.add(grid);

            // OPTIMIZED: Pre-create materials
            STATE.materials = {
                answer: new THREE.MeshLambertMaterial({ color: 0x4CAF50, emissive: 0x4CAF50, emissiveIntensity: 0.5 }),
                strategy: new THREE.MeshLambertMaterial({ color: 0xFFD700, emissive: 0xFFD700, emissiveIntensity: 0.5 }),
                wrong: new THREE.MeshLambertMaterial({ color: 0x666666, emissive: 0x333333, emissiveIntensity: 0.2 }),
                particle: new THREE.MeshBasicMaterial({ color: 0xffffff }),
                crosshair: new THREE.MeshBasicMaterial({ color: 0xff3333, opacity: 0.9, transparent: true, side: THREE.DoubleSide })
            };

            initObjectPools();
            console.log('[Three.js] Object pools created');
            initCrosshair();
            preloadTextures();
            console.log('[Three.js] Initialization complete');

            window.addEventListener('resize', onWindowResize);
        }

        function onWindowResize() {
            STATE.camera.aspect = window.innerWidth / window.innerHeight;
            STATE.camera.updateProjectionMatrix();
            STATE.renderer.setSize(window.innerWidth, window.innerHeight);
        }

        // ============================================
        // DUAL CROSSHAIRS (LARGE, VISIBLE) - FOR TWO HANDS
        // ============================================
        function createSingleCrosshair(index) {
            const group = new THREE.Group();

            // Different colors for each hand (hand 0 = green, hand 1 = red)
            const defaultColor = index === 0 ? 0x00ff00 : 0xff0000;

            // Large outer ring - very visible
            const ringMat = new THREE.MeshBasicMaterial({
                color: defaultColor,
                opacity: 0.8,
                transparent: true,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(
                new THREE.RingGeometry(1.8, 2.2, 32),
                ringMat
            );
            ring.name = 'ring';
            group.add(ring);

            // Inner ring
            const innerRing = new THREE.Mesh(
                new THREE.RingGeometry(0.8, 1.0, 24),
                ringMat.clone()
            );
            innerRing.name = 'innerRing';
            group.add(innerRing);

            // Center dot
            const dot = new THREE.Mesh(
                new THREE.CircleGeometry(0.3, 16),
                ringMat.clone()
            );
            dot.position.z = 0.01;
            dot.name = 'dot';
            group.add(dot);

            // Cross lines for better visibility
            const lineMat = new THREE.MeshBasicMaterial({
                color: defaultColor,
                opacity: 0.6,
                transparent: true,
                side: THREE.DoubleSide
            });
            const lineH = new THREE.Mesh(
                new THREE.PlaneGeometry(4.5, 0.15),
                lineMat
            );
            lineH.name = 'lineH';
            group.add(lineH);
            const lineV = new THREE.Mesh(
                new THREE.PlaneGeometry(0.15, 4.5),
                lineMat.clone()
            );
            lineV.name = 'lineV';
            group.add(lineV);

            group.visible = false;
            group.userData.handIndex = index;  // Store which hand this belongs to
            return group;
        }

        function initCrosshair() {
            // Create two crosshairs for two hands
            for (let i = 0; i < 2; i++) {
                const crosshair = createSingleCrosshair(i);
                STATE.scene.add(crosshair);
                STATE.crosshairs[i] = crosshair;
            }
        }

        // Change crosshair color (green = normal, red = firing)
        function setCrosshairColor(handIndex, color) {
            const crosshair = STATE.crosshairs[handIndex];
            if (!crosshair) return;
            crosshair.children.forEach(child => {
                if (child.material) {
                    child.material.color.setHex(color);
                }
            });
        }

        function updateCrosshairPosition(handIndex, targetX, targetY, targetZ) {
            STATE.crosshairTargetPos[handIndex].x = targetX;
            STATE.crosshairTargetPos[handIndex].y = targetY;
            STATE.crosshairTargetPos[handIndex].z = targetZ;
        }

        function interpolateCrosshair(handIndex) {
            const crosshair = STATE.crosshairs[handIndex];
            if (!crosshair) return;

            const lerp = CONFIG.CROSSHAIR_LERP;
            STATE.crosshairCurrentPos[handIndex].x += (STATE.crosshairTargetPos[handIndex].x - STATE.crosshairCurrentPos[handIndex].x) * lerp;
            STATE.crosshairCurrentPos[handIndex].y += (STATE.crosshairTargetPos[handIndex].y - STATE.crosshairCurrentPos[handIndex].y) * lerp;
            STATE.crosshairCurrentPos[handIndex].z += (STATE.crosshairTargetPos[handIndex].z - STATE.crosshairCurrentPos[handIndex].z) * lerp;

            crosshair.position.set(
                STATE.crosshairCurrentPos[handIndex].x,
                STATE.crosshairCurrentPos[handIndex].y,
                STATE.crosshairCurrentPos[handIndex].z
            );
            crosshair.lookAt(STATE.camera.position);
        }

        // Convenience function to interpolate all visible crosshairs
        function interpolateAllCrosshairs() {
            for (let i = 0; i < 2; i++) {
                if (STATE.crosshairs[i] && STATE.crosshairs[i].visible) {
                    interpolateCrosshair(i);
                }
            }
        }

        // ============================================
        // OBJECT POOLING (OPTIMIZED)
        // ============================================
        function initObjectPools() {
            // Target pool
            const balloonGeom = new THREE.SphereGeometry(1, 12, 10);
            balloonGeom.scale(0.8, 1.0, 0.8);

            for (let i = 0; i < CONFIG.TARGET_POOL_SIZE; i++) {
                const mesh = new THREE.Mesh(balloonGeom, STATE.materials.wrong.clone());

                // String
                const stringGeom = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 4);
                const stringMat = new THREE.MeshBasicMaterial({ color: 0x555555 });
                const string = new THREE.Mesh(stringGeom, stringMat);
                string.position.y = -1.1;
                mesh.add(string);

                // Number sprite - positioned in front of balloon
                const spriteMat = new THREE.SpriteMaterial({
                    map: null,
                    transparent: true,
                    depthTest: false  // Always render on top
                });
                const sprite = new THREE.Sprite(spriteMat);
                sprite.position.set(0, 0.2, 1.2);
                sprite.scale.set(2.0, 2.0, 1);
                mesh.add(sprite);
                mesh.userData.sprite = sprite;

                mesh.visible = false;
                STATE.scene.add(mesh);
                STATE.targetPool.push(mesh);
            }

            // Particle pool
            const particleGeom = new THREE.SphereGeometry(0.08, 4, 4);
            for (let i = 0; i < CONFIG.PARTICLE_POOL_SIZE; i++) {
                const p = new THREE.Mesh(particleGeom, STATE.materials.particle.clone());
                p.visible = false;
                STATE.scene.add(p);
                STATE.particlePool.push(p);
            }
        }

        function getTarget() {
            return STATE.targetPool.find(t => !t.visible);
        }

        function getParticle() {
            return STATE.particlePool.find(p => !p.visible);
        }

        // ============================================
        // TARGET MANAGEMENT
        // ============================================
        // Random balloon colors (no hints!)
        const BALLOON_COLORS = [
            0xff6b6b,  // Red
            0x4ecdc4,  // Teal
            0xffe66d,  // Yellow
            0x95e1d3,  // Mint
            0xf38181,  // Coral
            0xaa96da,  // Purple
            0xfcbad3,  // Pink
            0xa8d8ea,  // Sky blue
            0xf9f871,  // Lemon
            0x98ddca   // Seafoam
        ];

        function createTarget(number, isAnswer, isStrategy) {
            const target = getTarget();
            if (!target) return null;

            // Random color - NO HINTS about which is correct!
            const color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
            target.material.color.setHex(color);
            target.material.emissive.setHex(color);
            target.material.emissiveIntensity = 0.3;

            // Position - keep within visible screen area
            const x = (Math.random() - 0.5) * 16;  // -8 to 8 (narrower)
            const height = -2 + Math.random() * 7;  // -2 to 5 (more centered)
            const z = -8 - Math.random() * 4;  // -8 to -12 (closer)

            target.position.set(x, height, z);

            // OPTIMIZED: Use cached texture
            const sprite = target.userData.sprite;
            sprite.material.map = getNumberTexture(number);
            sprite.material.needsUpdate = true;
            sprite.position.set(0, 0.2, 1.2);  // Position in front of balloon
            sprite.scale.set(2.0, 2.0, 1);  // Larger number

            // Speed variation: 30% chance of faster balloon
            const speedMultiplier = Math.random() < 0.3 ? 1.8 : 1.0;

            target.userData = {
                number,
                isAnswer,
                isStrategy,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.015 * speedMultiplier,
                    (0.012 + Math.random() * 0.008) * speedMultiplier,
                    (Math.random() - 0.5) * 0.008 * speedMultiplier
                ),
                sprite,
                pulsePhase: Math.random() * Math.PI * 2,
                speedMultiplier  // Store for visual effect
            };

            target.visible = true;
            target.scale.set(1.0, 1.2, 1.0);  // Bigger balloons
            STATE.targets.push(target);

            return target;
        }

        function spawnTargets() {
            // Release old targets (preserve sprite reference)
            STATE.targets.forEach(t => {
                t.visible = false;
                const sprite = t.userData.sprite;
                t.userData = { sprite };  // Keep sprite reference
            });
            STATE.targets = [];

            if (!STATE.currentQuestion) return;

            const { answer, strategy, allNumbers } = STATE.currentQuestion;

            // IMPORTANT: Create answer balloon first to guarantee it exists
            const answerTarget = createTarget(answer, true, false);
            if (!answerTarget) {
                console.error('Failed to create answer target!');
            }

            // Then create other targets
            allNumbers.forEach(num => {
                if (num === answer) return;  // Skip answer, already created
                const isStrategy = strategy.includes(num);
                createTarget(num, false, isStrategy);
            });
        }

        function updateTargets(deltaTime) {
            const time = performance.now() * 0.001;

            STATE.targets.forEach(target => {
                if (!target.visible || !target.userData.velocity) return;

                target.position.add(target.userData.velocity);
                target.rotation.y += 0.012;

                // Boundary checks - keep balloons in visible area
                if (Math.abs(target.position.x) > 9) target.userData.velocity.x *= -1;
                if (target.position.y > 6) target.userData.velocity.y *= -1;
                else if (target.position.y < -3) target.userData.velocity.y *= -1;
                if (target.position.z > -6 || target.position.z < -14) target.userData.velocity.z *= -1;

                // Visual effects - same for all balloons (no hints!)
                const pulse = Math.sin(time * 2 + target.userData.pulsePhase) * 0.5 + 0.5;
                target.material.emissiveIntensity = 0.2 + pulse * 0.2;
                const s = 1 + pulse * 0.05;  // Subtle size change
                target.scale.set(1.0 * s, 1.2 * s, 1.0 * s);
            });
        }

        // ============================================
        // MEDIAPIPE HANDS (IMPROVED STABILITY)
        // ============================================
        let mediapipeRetries = 0;
        const MAX_RETRIES = 3;

        async function initMediaPipe() {
            try {
                updateLoadingProgress(20, 'カメラを起動中...');

                STATE.videoElement = document.getElementById('hiddenVideo');

                // Request camera with fallback options
                let stream;
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }
                    });
                } catch (e) {
                    console.warn('Front camera failed, trying any camera:', e);
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: { width: { ideal: 320 }, height: { ideal: 240 } }
                    });
                }

                STATE.videoElement.srcObject = stream;

                // Wait for video to actually be playing
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Video timeout')), 10000);
                    STATE.videoElement.onloadedmetadata = () => {
                        STATE.videoElement.play().then(() => {
                            clearTimeout(timeout);
                            // Wait a bit more for stable frames
                            setTimeout(resolve, 500);
                        }).catch(reject);
                    };
                    STATE.videoElement.onerror = reject;
                });

                updateLoadingProgress(50, '手認識モデルを読み込み中...');

                STATE.hands = new Hands({
                    locateFile: (file) => `https://unpkg.com/@mediapipe/hands@0.4.1646424915/${file}`
                });

                STATE.hands.setOptions({
                    maxNumHands: 2,  // Enable detection of both hands
                    modelComplexity: 0,
                    minDetectionConfidence: 0.5,  // Slightly lower for better detection
                    minTrackingConfidence: 0.4
                });

                STATE.hands.onResults(onHandsResults);

                updateLoadingProgress(80, 'モデルを準備中...');

                // Warm up the model with a test frame - this ensures model is fully loaded
                await warmUpMediaPipe();

                updateLoadingProgress(100, '準備完了!');
                STATE.modelReady = true;
                mediapipeRetries = 0;

                console.log('[MediaPipe] Initialization complete');

            } catch (error) {
                console.error('[MediaPipe] Init failed:', error);
                mediapipeRetries++;

                if (mediapipeRetries < MAX_RETRIES) {
                    updateLoadingProgress(20, `再試行中... (${mediapipeRetries}/${MAX_RETRIES})`);
                    await new Promise(r => setTimeout(r, 1000));
                    return initMediaPipe();  // Retry
                }

                throw new Error(`Camera init failed: ${error.message}`);
            }
        }

        async function warmUpMediaPipe() {
            // Send a few frames to warm up the model
            for (let i = 0; i < 3; i++) {
                try {
                    await STATE.hands.send({ image: STATE.videoElement });
                    await new Promise(r => setTimeout(r, 100));
                } catch (e) {
                    console.warn('[MediaPipe] Warmup frame failed:', e);
                }
            }
        }

        function updateLoadingProgress(percent, text) {
            const fill = document.getElementById('progressFill');
            const txt = document.getElementById('loadingText');
            if (fill) fill.style.width = `${percent}%`;
            if (txt) txt.textContent = text;
        }

        function onHandsResults(results) {
            STATE.handsData = results.multiHandLandmarks || [];
            // Debug: Log hand count
            if (STATE.handsData.length > 0) {
                console.log(`[MediaPipe] Detected ${STATE.handsData.length} hand(s)`);
            }
        }

        // ============================================
        // HAND GESTURE FSM - FLICK UP TO SHOOT (DUAL HAND SUPPORT)
        // Improved classification of: tremor vs movement vs shooting
        // ============================================

        // Constants for shooting detection
        const VELOCITY_HISTORY_SIZE = 4;
        const FLICK_THRESHOLD = 0.03;
        const FLICK_ACCUMULATED = 0.08;
        const SHOOT_COOLDOWN = 400;  // ms between shots
        const POS_HISTORY_SIZE = 6;

        // Tracking data for each hand (array index = hand index)
        const handTracking = [
            {
                prevIndexY: 0.5,
                velocityHistory: [],
                lastShootTime: 0,
                posHistory: [],
                smoothedX: 0,
                smoothedY: 0
            },
            {
                prevIndexY: 0.5,
                velocityHistory: [],
                lastShootTime: 0,
                posHistory: [],
                smoothedX: 0,
                smoothedY: 0
            }
        ];

        // Process a single hand's gestures
        function processSingleHand(handIndex, landmarks, now) {
            const tracking = handTracking[handIndex];

            // Thumb landmarks
            const thumbTip = landmarks[4];
            const thumbMCP = landmarks[2];

            // Index finger landmarks
            const indexTip = landmarks[8];
            const indexPIP = landmarks[6];

            // Check if thumb is extended (pointing up/out) - RELAXED condition
            const thumbLength = Math.sqrt(
                Math.pow(thumbTip.x - thumbMCP.x, 2) +
                Math.pow(thumbTip.y - thumbMCP.y, 2)
            );
            const isThumbUp = thumbLength > 0.06;

            // Check index finger extension
            const indexLength = Math.sqrt(
                Math.pow(indexTip.x - indexPIP.x, 2) +
                Math.pow(indexTip.y - indexPIP.y, 2) +
                Math.pow(indexTip.z - indexPIP.z, 2)
            );
            const isIndexExtended = indexLength > 0.06;

            // Gun gesture: thumb up is required
            const isGunPose = isThumbUp;

            // === SHOOTING DETECTION - IMPROVED ===
            // Track velocity over multiple frames for more reliable detection
            const currentY = indexTip.y;
            const currentVelocity = tracking.prevIndexY - currentY;  // Positive = moving up
            tracking.prevIndexY = currentY;

            // Add to velocity history
            tracking.velocityHistory.push(currentVelocity);
            if (tracking.velocityHistory.length > VELOCITY_HISTORY_SIZE) {
                tracking.velocityHistory.shift();
            }

            // Check for flick pattern:
            // 1. Recent frames show consistent upward movement
            // 2. Total accumulated movement exceeds threshold
            // 3. Cooldown has passed
            let isFlickUp = false;
            const cooldownPassed = (now - tracking.lastShootTime) > SHOOT_COOLDOWN;

            if (tracking.velocityHistory.length >= 2 && cooldownPassed) {
                // Check if recent velocities are all positive (upward)
                const recentVelocities = tracking.velocityHistory.slice(-3);
                const allUpward = recentVelocities.every(v => v > FLICK_THRESHOLD * 0.5);

                // Calculate accumulated movement
                const accumulated = recentVelocities.reduce((sum, v) => sum + Math.max(0, v), 0);

                // Also check peak velocity
                const peakVelocity = Math.max(...recentVelocities);

                // Fire if: consistent upward movement with enough total distance OR strong single flick
                isFlickUp = (allUpward && accumulated > FLICK_ACCUMULATED) ||
                            (peakVelocity > FLICK_THRESHOLD * 2);
            }

            // === CROSSHAIR POSITION (Movement vs Tremor Classification) ===
            const rawX = -(indexTip.x - 0.5) * 22;
            const rawY = -(indexTip.y - 0.5) * 16 + 1.5;
            const worldZ = 0;

            // Add to position history
            tracking.posHistory.push({ x: rawX, y: rawY, time: now });
            if (tracking.posHistory.length > POS_HISTORY_SIZE) {
                tracking.posHistory.shift();
            }

            // Calculate current movement delta
            const dx = rawX - tracking.smoothedX;
            const dy = rawY - tracking.smoothedY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check if movement is consistent (same direction) or erratic (tremor)
            let isConsistentMove = false;
            if (tracking.posHistory.length >= 3) {
                // Calculate direction of recent movement
                const recent = tracking.posHistory.slice(-3);
                const dirX = recent[2].x - recent[0].x;
                const dirY = recent[2].y - recent[0].y;
                const dirMag = Math.sqrt(dirX * dirX + dirY * dirY);

                // Check if current movement aligns with recent direction
                if (dirMag > 0.3) {
                    // Normalize and compare
                    const normDirX = dirX / dirMag;
                    const normDirY = dirY / dirMag;
                    const normDx = distance > 0.01 ? dx / distance : 0;
                    const normDy = distance > 0.01 ? dy / distance : 0;
                    const dotProduct = normDirX * normDx + normDirY * normDy;
                    isConsistentMove = dotProduct > 0.5;  // Same general direction
                }
            }

            // Movement classification - MORE RESPONSIVE
            const SMALL_MOVE = 0.2;   // Lower threshold for quicker response
            const LARGE_MOVE = 1.0;   // Lower threshold for fast response

            let worldX = tracking.smoothedX;
            let worldY = tracking.smoothedY;
            let moveSpeed = 0;

            if (distance > LARGE_MOVE) {
                // Large movement: follow very quickly
                moveSpeed = 0.8;
            } else if (distance > SMALL_MOVE && isConsistentMove) {
                // Consistent directional movement: follow quickly
                moveSpeed = 0.6;
            } else if (distance > SMALL_MOVE) {
                // Movement but erratic: follow at medium speed
                moveSpeed = 0.3;
            } else {
                // Very small movement: slow response (tremor rejection)
                moveSpeed = 0.1;
            }

            // Apply movement
            tracking.smoothedX += dx * moveSpeed;
            tracking.smoothedY += dy * moveSpeed;
            worldX = tracking.smoothedX;
            worldY = tracking.smoothedY;

            // ALWAYS show crosshair when hand is detected
            updateCrosshairPosition(handIndex, worldX, worldY, worldZ);
            const crosshair = STATE.crosshairs[handIndex];
            if (crosshair) {
                crosshair.visible = true;

                // Hand-specific colors for better distinction
                const readyColor = handIndex === 0 ? 0x00ff00 : 0xff0000;  // Green or Red
                const partialColor = handIndex === 0 ? 0x00aa00 : 0xaa0000;  // Darker green/red

                // Change color based on state
                if (isGunPose && isIndexExtended) {
                    setCrosshairColor(handIndex, readyColor);  // Ready to fire (bright)
                } else if (isGunPose) {
                    setCrosshairColor(handIndex, partialColor);  // Partial gesture (darker)
                } else {
                    setCrosshairColor(handIndex, 0x888888);  // Gray - not ready
                }
            }

            // State machine for this hand
            const handState = STATE.handStates[handIndex];
            switch (handState.state) {
                case 'idle':
                    if (isGunPose && isIndexExtended) handState.state = 'ready';
                    break;

                case 'ready':
                    // Fire when quick upward flick detected
                    if (isGunPose && isFlickUp) {
                        handState.state = 'fired';
                        tracking.lastShootTime = now;  // Track shoot time
                        tracking.velocityHistory = [];  // Clear velocity history after shot
                        fireShot(handIndex);
                    } else if (!isGunPose) {
                        handState.state = 'idle';
                    }
                    break;

                case 'fired':
                    handState.state = 'cooldown';
                    handState.cooldownEnd = now + SHOOT_COOLDOWN;
                    break;

                case 'cooldown':
                    if (now >= handState.cooldownEnd) {
                        if (isGunPose && isIndexExtended) {
                            handState.state = 'ready';
                        } else if (isGunPose) {
                            handState.state = 'ready';
                        } else {
                            handState.state = 'idle';
                        }
                    }
                    break;
            }
        }

        // Main update function for all hands
        function updateHandGestures() {
            const now = performance.now();

            // Hide all crosshairs if no hands detected
            if (!STATE.handsData || STATE.handsData.length === 0) {
                for (let i = 0; i < 2; i++) {
                    STATE.handStates[i].state = 'idle';
                    if (STATE.crosshairs[i]) STATE.crosshairs[i].visible = false;
                }
                updateHandStatus(0);
                return;
            }

            // Show hand count status
            updateHandStatus(STATE.handsData.length);

            // Process each detected hand (up to 2)
            for (let i = 0; i < Math.min(STATE.handsData.length, 2); i++) {
                processSingleHand(i, STATE.handsData[i], now);
            }

            // Hide unused crosshairs if only one hand is detected
            if (STATE.handsData.length < 2) {
                if (STATE.crosshairs[1]) STATE.crosshairs[1].visible = false;
            }
        }

        // Show hand tracking status
        function updateHandStatus(handCount) {
            let status = document.getElementById('handStatus');
            if (!status) {
                status = document.createElement('div');
                status.id = 'handStatus';
                status.style.cssText = 'position:fixed;bottom:20px;left:20px;padding:10px 15px;border-radius:8px;font-size:14px;font-weight:bold;z-index:1000;';
                document.body.appendChild(status);
            }

            // Show MediaPipe raw data count
            const rawCount = STATE.handsData ? STATE.handsData.length : 0;

            if (handCount === 0) {
                status.textContent = '👆 手を見せてね';
                status.style.background = 'rgba(255,100,100,0.8)';
                status.style.color = '#fff';
            } else if (handCount === 1) {
                status.textContent = `✋ 手を検出中 (${handCount}) [Raw: ${rawCount}]`;
                status.style.background = 'rgba(0,255,0,0.8)';
                status.style.color = '#000';
            } else {
                status.textContent = `✋✋ 両手を検出中! (${handCount}) [Raw: ${rawCount}]`;
                status.style.background = 'rgba(0,255,255,0.8)';
                status.style.color = '#000';
            }
        }

        function fireShot(handIndex) {
            playSFX('shoot');
            STATE.player.shots++;

            // Change crosshair to WHITE when firing (bright flash)
            setCrosshairColor(handIndex, 0xffffff);
            setTimeout(() => {
                // Return to default color for this hand
                const defaultColor = handIndex === 0 ? 0x00ff00 : 0xff0000;
                setCrosshairColor(handIndex, defaultColor);
            }, 200);

            // Create muzzle flash effect at crosshair position
            createMuzzleFlash(handIndex);

            // Small screen shake for shooting
            triggerScreenShake(0.15);

            // Raycast from camera through crosshair position
            const raycaster = new THREE.Raycaster();

            // Convert world position to NDC (-1 to 1)
            const crosshairWorld = new THREE.Vector3(
                STATE.crosshairCurrentPos[handIndex].x,
                STATE.crosshairCurrentPos[handIndex].y,
                STATE.crosshairCurrentPos[handIndex].z
            );
            const ndc = crosshairWorld.clone().project(STATE.camera);

            raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), STATE.camera);

            const intersects = raycaster.intersectObjects(STATE.targets.filter(t => t.visible));

            if (intersects.length > 0) {
                handleHit(intersects[0].object);
            } else {
                showFeedback('MISS', '#888');
                playSFX('miss');
            }
        }

        function handleHit(target) {
            const { isAnswer, isStrategy, number, isBoss } = target.userData;

            // Store position before hiding
            const hitPosition = target.position.clone();

            STATE.player.hits++;

            // Calculate score multiplier based on event
            let multiplier = 1;
            if (currentEvent === EVENTS.BONUS) multiplier = 2;
            else if (currentEvent === EVENTS.SPEED) multiplier = 1.5;
            else if (currentEvent === EVENTS.GOLDEN && isAnswer) multiplier = 5;

            // Crosshair pulse on hit
            pulseCrosshair();

            // BOSS BATTLE LOGIC
            if (isBoss && isAnswer) {
                bossHealth--;
                triggerScreenShake(0.6);
                createExplosion(hitPosition, 0xff0000);
                playSFX('correct');

                if (bossHealth <= 0) {
                    // Boss defeated!
                    target.visible = false;
                    STATE.targets = STATE.targets.filter(t => t !== target);

                    const bossBonus = 300 * (currentWorld + 1);
                    STATE.player.score += bossBonus;
                    STATE.player.streak++;
                    STATE.player.bestStreak = Math.max(STATE.player.bestStreak, STATE.player.streak);

                    showFeedback(`👹 BOSS DOWN! +${bossBonus}`, '#ff0000');
                    showFloatingScore(hitPosition, `+${bossBonus}`, '#ff0000');
                    playSFX('levelup');
                    triggerScreenShake(1.0);
                    triggerBgFlash(0xff0000);

                    // Big explosion
                    for (let i = 0; i < 3; i++) {
                        setTimeout(() => createExplosion(hitPosition.clone().add(new THREE.Vector3(
                            (Math.random() - 0.5) * 2,
                            (Math.random() - 0.5) * 2,
                            0
                        )), [0xff0000, 0xff8800, 0xffff00][i]), i * 100);
                    }

                    currentEvent = EVENTS.NORMAL;
                    nextQuestion();
                } else {
                    // Boss still alive - show damage
                    showFeedback(`👹 HIT! HP:${bossHealth}`, '#ff8800');
                    target.scale.multiplyScalar(0.9);  // Shrink slightly
                }
                updateHUD();
                return;
            }

            // Normal target logic
            // Hide target
            target.visible = false;
            STATE.targets = STATE.targets.filter(t => t !== target);

            // Explosion effect
            createExplosion(hitPosition, isAnswer ? 0x4CAF50 : isStrategy ? 0xFFD700 : 0xff4444);

            if (isAnswer) {
                // Update skill - correct answer!
                if (STATE.currentQuestion && STATE.currentQuestion.questionType) {
                    updateSkill(STATE.currentQuestion.questionType, true);
                }

                const points = Math.floor(CONFIG.SCORE_CORRECT * multiplier);
                STATE.player.score += points;
                STATE.player.streak++;
                STATE.player.bestStreak = Math.max(STATE.player.bestStreak, STATE.player.streak);

                const label = multiplier > 1 ? `+${points} (x${multiplier})` : `+${points}`;
                showFeedback(label, '#4CAF50');
                showFloatingScore(hitPosition, label, '#4CAF50');
                showCombo(STATE.player.streak);
                playSFX('correct');
                playComboSound(STATE.player.streak);

                // VFX: Screen shake and background flash for correct answer
                triggerScreenShake(0.4);
                triggerBgFlash(0x1a3a1a);  // Green flash

                // Update streak fire effect
                createStreakFire();

                // Difficulty progression
                if (STATE.player.streak >= 5 && STATE.player.streak % 5 === 0 && STATE.difficultyLevel < 7) {
                    STATE.difficultyLevel++;
                    showStrategyHint('Level UP!');
                    playLevelUpSound();
                }

                // Handle event logic or move to next question
                if (!handleEventHit(true)) {
                    nextQuestion();
                }

            } else if (isStrategy) {
                const points = Math.floor(CONFIG.SCORE_SMART * multiplier);
                STATE.player.score += points;
                STATE.player.streak++;
                STATE.player.bestStreak = Math.max(STATE.player.bestStreak, STATE.player.streak);

                showFeedback(`SMART +${points}`, '#FFD700');
                showFloatingScore(hitPosition, `SMART! +${points}`, '#FFD700');
                showCombo(STATE.player.streak);
                playSFX('smart');
                playComboSound(STATE.player.streak);

                // VFX: Golden flash for smart hit
                triggerScreenShake(0.3);
                triggerBgFlash(0x2a2a0a);  // Golden flash

                // Update streak fire effect
                createStreakFire();

                // Show learning hint
                if (STATE.currentQuestion.hint) {
                    showStrategyHint(STATE.currentQuestion.hint);
                }

            } else {
                // Update skill - wrong answer
                if (STATE.currentQuestion && STATE.currentQuestion.questionType) {
                    updateSkill(STATE.currentQuestion.questionType, false);
                }

                STATE.player.score = Math.max(0, STATE.player.score - CONFIG.PENALTY_WRONG);
                STATE.player.streak = 0;  // Reset streak completely on wrong answer

                showFeedback(`WRONG! -${CONFIG.PENALTY_WRONG}`, '#ff0000');
                showFloatingScore(hitPosition, `-${CONFIG.PENALTY_WRONG}`, '#ff0000');
                playSFX('wrong');

                // VFX: Stronger red flash for wrong answer
                triggerScreenShake(0.8);
                triggerBgFlash(0x4a0a0a);  // Stronger red flash

                // Reset streak fire
                const scoreEl = document.getElementById('playerScore');
                if (scoreEl) {
                    scoreEl.style.boxShadow = '';
                    scoreEl.style.textShadow = '';
                }

                if (STATE.player.streak === 0 && STATE.difficultyLevel > 1) {
                    STATE.difficultyLevel--;
                }

                // Handle event logic for wrong answer
                handleEventHit(false);
            }

            updateHUD();
        }

        // ============================================
        // VFX SYSTEM (ENHANCED)
        // ============================================

        // Screen shake state
        let screenShake = { intensity: 0, decay: 0.9 };

        function triggerScreenShake(intensity) {
            screenShake.intensity = Math.max(screenShake.intensity, intensity);
        }

        function updateScreenShake() {
            if (screenShake.intensity > 0.01) {
                const shakeX = (Math.random() - 0.5) * screenShake.intensity;
                const shakeY = (Math.random() - 0.5) * screenShake.intensity;
                STATE.camera.position.x = shakeX;
                STATE.camera.position.y = 2 + shakeY;
                screenShake.intensity *= screenShake.decay;
            } else {
                STATE.camera.position.x = 0;
                STATE.camera.position.y = 2;
                screenShake.intensity = 0;
            }
        }

        // Background flash
        let bgFlash = { active: false, color: 0x0a0a1a, targetColor: 0x0a0a1a, speed: 0.1 };

        function triggerBgFlash(color) {
            bgFlash.active = true;
            bgFlash.color = color;
            setTimeout(() => {
                bgFlash.active = false;
            }, 150);
        }

        function updateBgFlash() {
            if (bgFlash.active) {
                STATE.scene.background.setHex(bgFlash.color);
            } else {
                // Lerp back to original
                STATE.scene.background.lerp(new THREE.Color(0x0a0a1a), 0.15);
            }
        }

        // Muzzle flash effect
        function createMuzzleFlash(handIndex) {
            const crosshair = STATE.crosshairs[handIndex];
            if (!crosshair || !crosshair.visible) return;

            // Create multiple flash particles
            for (let i = 0; i < 5; i++) {
                const p = getParticle();
                if (!p) break;

                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 0.5;

                p.position.set(
                    crosshair.position.x + Math.cos(angle) * dist,
                    crosshair.position.y + Math.sin(angle) * dist,
                    crosshair.position.z + 0.5
                );

                // Yellow/orange flash colors
                const flashColors = [0xffff00, 0xff8800, 0xffaa00, 0xffffff];
                p.material.color.setHex(flashColors[Math.floor(Math.random() * flashColors.length)]);
                p.material.opacity = 1;
                p.scale.setScalar(0.3 + Math.random() * 0.4);

                p.userData = {
                    velocity: new THREE.Vector3(
                        (Math.random() - 0.5) * 0.2,
                        (Math.random() - 0.5) * 0.2,
                        Math.random() * 0.3
                    ),
                    life: 0.3 + Math.random() * 0.2,
                    isFlash: true
                };

                p.visible = true;
                STATE.particles.push(p);
            }
        }

        // Enhanced explosion with more particles and variety
        function createExplosion(position, color) {
            const count = 15;  // More particles

            // Main explosion particles
            for (let i = 0; i < count; i++) {
                const p = getParticle();
                if (!p) break;

                p.position.copy(position);

                // Vary colors slightly
                const colorObj = new THREE.Color(color);
                colorObj.offsetHSL(0, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.3);
                p.material.color.copy(colorObj);
                p.material.opacity = 1;

                const size = 0.4 + Math.random() * 0.8;
                p.scale.setScalar(size);

                // Explosive outward velocity
                const speed = 0.2 + Math.random() * 0.4;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;

                p.userData = {
                    velocity: new THREE.Vector3(
                        Math.sin(phi) * Math.cos(theta) * speed,
                        Math.sin(phi) * Math.sin(theta) * speed + 0.1,
                        Math.cos(phi) * speed
                    ),
                    life: 0.8 + Math.random() * 0.5,
                    initialSize: size,
                    hasTrail: Math.random() > 0.5
                };

                p.visible = true;
                STATE.particles.push(p);
            }

            // Ring shockwave effect
            createShockwave(position, color);
        }

        // Shockwave ring effect
        function createShockwave(position, color) {
            const ringGeom = new THREE.RingGeometry(0.1, 0.3, 24);
            const ringMat = new THREE.MeshBasicMaterial({
                color: color,
                opacity: 0.8,
                transparent: true,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeom, ringMat);
            ring.position.copy(position);
            ring.lookAt(STATE.camera.position);
            STATE.scene.add(ring);

            // Animate ring expansion
            let scale = 1;
            let opacity = 0.8;
            const animateRing = () => {
                scale += 0.4;
                opacity -= 0.08;
                ring.scale.setScalar(scale);
                ring.material.opacity = opacity;

                if (opacity > 0) {
                    requestAnimationFrame(animateRing);
                } else {
                    STATE.scene.remove(ring);
                    ring.geometry.dispose();
                    ring.material.dispose();
                }
            };
            requestAnimationFrame(animateRing);
        }

        // Crosshair pulse effect on hit (pulses all visible crosshairs)
        function pulseCrosshair() {
            let pulseScale = 1.5;
            const animatePulse = () => {
                pulseScale -= 0.08;
                if (pulseScale > 1) {
                    // Pulse all visible crosshairs
                    for (let i = 0; i < 2; i++) {
                        if (STATE.crosshairs[i] && STATE.crosshairs[i].visible) {
                            STATE.crosshairs[i].scale.setScalar(pulseScale);
                        }
                    }
                    requestAnimationFrame(animatePulse);
                } else {
                    // Reset scale
                    for (let i = 0; i < 2; i++) {
                        if (STATE.crosshairs[i]) {
                            STATE.crosshairs[i].scale.setScalar(1);
                        }
                    }
                }
            };
            requestAnimationFrame(animatePulse);
        }

        // Streak fire particles around score
        function createStreakFire() {
            if (STATE.player.streak < 3) return;

            const scoreEl = document.getElementById('playerScore');
            if (!scoreEl) return;

            // Add fire glow effect
            const intensity = Math.min(STATE.player.streak / 10, 1);
            scoreEl.style.boxShadow = `0 0 ${20 + intensity * 30}px rgba(255, ${150 - intensity * 100}, 0, ${0.5 + intensity * 0.5})`;
            scoreEl.style.textShadow = `0 0 10px rgba(255, ${200 - intensity * 100}, 0, 1)`;
        }

        // Show floating score at world position
        function showFloatingScore(worldPos, text, color) {
            // Project 3D position to screen
            const screenPos = worldPos.clone().project(STATE.camera);
            const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

            const div = document.createElement('div');
            div.className = 'floating-score';
            div.textContent = text;
            div.style.left = `${x}px`;
            div.style.top = `${y}px`;
            div.style.color = color;
            document.body.appendChild(div);
            setTimeout(() => div.remove(), 1000);
        }

        // Show combo display
        function showCombo(streak) {
            if (streak < 2) return;

            document.querySelectorAll('.combo-display').forEach(d => d.remove());

            const div = document.createElement('div');
            div.className = 'combo-display';
            div.textContent = `${streak}x COMBO!`;

            if (streak >= 10) {
                div.style.color = '#FF0000';
                div.style.fontSize = '4rem';
                div.textContent = `🔥 ${streak}x COMBO! 🔥`;
            } else if (streak >= 5) {
                div.style.color = '#FF8C00';
                div.style.fontSize = '3.5rem';
            }

            document.body.appendChild(div);
            setTimeout(() => div.remove(), 1500);
        }

        function updateParticles(deltaTime) {
            STATE.particles = STATE.particles.filter(p => {
                if (!p.userData) return false;

                p.position.add(p.userData.velocity);

                // Gravity (less for flash particles)
                if (!p.userData.isFlash) {
                    p.userData.velocity.y -= 0.015;
                }

                p.userData.life -= deltaTime * (p.userData.isFlash ? 8 : 2.5);
                p.material.opacity = Math.max(0, p.userData.life);

                // Size animation
                const lifeRatio = p.userData.life / (p.userData.initialSize || 1);
                p.scale.setScalar((p.userData.initialSize || 0.8) * Math.max(0.1, lifeRatio));

                if (p.userData.life <= 0) {
                    p.visible = false;
                    return false;
                }
                return true;
            });
        }

        // ============================================
        // UI SYSTEM
        // ============================================
        function showOverlay(id) {
            document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
            document.getElementById(id)?.classList.remove('hidden');
        }

        function hideAllOverlays() {
            document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
        }

        function showFeedback(text, color) {
            document.querySelectorAll('.feedback').forEach(f => f.remove());
            const div = document.createElement('div');
            div.className = 'feedback';
            div.textContent = text;
            div.style.color = color;
            document.body.appendChild(div);
            setTimeout(() => div.remove(), 600);
        }

        function showStrategyHint(text) {
            document.querySelectorAll('.strategy-hint').forEach(h => h.remove());
            const div = document.createElement('div');
            div.className = 'strategy-hint';
            div.textContent = text;
            document.body.appendChild(div);
            setTimeout(() => div.remove(), 2000);
        }

        function updateHUD() {
            // World and stage info - COMPACT
            const world = WORLDS[currentWorld];
            const worldEmoji = world.name.split(' ')[0];  // Get emoji only
            document.getElementById('worldDisplay').textContent = worldEmoji;
            document.getElementById('stageDisplay').textContent = `${currentWorld + 1}-${currentStage}`;
            document.getElementById('questionCount').textContent = `${STATE.questionIndex + 1}/${CONFIG.QUESTIONS_PER_STAGE}`;
            document.getElementById('timeDisplay').textContent = `${Math.ceil(Math.max(0, STATE.timeLeft))}`;

            // Score display - COMPACT
            const p = STATE.player;
            p.accuracy = p.shots > 0 ? Math.round((p.hits / p.shots) * 100) : 0;
            const scoreEl = document.getElementById('playerScore');
            scoreEl.textContent = `${totalScore + p.score}🔥${p.streak}`;

            if (p.streak >= 5) {
                scoreEl.classList.add('streak-glow');
            } else {
                scoreEl.classList.remove('streak-glow');
            }

            // Event display - COMPACT
            const eventEl = document.getElementById('eventDisplay');
            if (currentEvent !== EVENTS.NORMAL) {
                eventEl.style.display = 'block';
                switch (currentEvent) {
                    case EVENTS.BONUS: eventEl.textContent = '✨x2'; eventEl.style.background = 'gold'; eventEl.style.color = '#000'; break;
                    case EVENTS.SPEED: eventEl.textContent = '⚡'; eventEl.style.background = '#ff6600'; break;
                    case EVENTS.BOSS: eventEl.textContent = `👹${bossHealth}`; eventEl.style.background = '#ff0000'; break;
                    case EVENTS.FRENZY: eventEl.textContent = '🎯'; eventEl.style.background = '#ff00ff'; break;
                    case EVENTS.GOLDEN: eventEl.textContent = '🌟x5'; eventEl.style.background = '#ffd700'; eventEl.style.color = '#000'; break;
                }
            } else {
                eventEl.style.display = 'none';
            }

            // Question display with event styling
            if (STATE.currentQuestion) {
                const qDisplay = document.getElementById('questionDisplay');
                qDisplay.textContent = STATE.currentQuestion.question;
                if (currentEvent === EVENTS.BOSS) {
                    qDisplay.style.background = 'linear-gradient(135deg, #ff0000, #8b0000)';
                } else if (currentEvent === EVENTS.BONUS) {
                    qDisplay.style.background = 'linear-gradient(135deg, #ffd700, #ff8c00)';
                } else {
                    qDisplay.style.background = '';
                }
            }

            // Update background color based on world
            if (STATE.scene) {
                STATE.scene.background.lerp(new THREE.Color(world.color), 0.02);
            }
        }

        // ============================================
        // ENHANCED EVENT SYSTEM
        // ============================================
        let eventState = {
            questionsRemaining: 0,
            correctInEvent: 0,
            eventStartTime: 0,
            targetCategory: null
        };

        // Trigger random events - MORE INTERESTING!
        function triggerRandomEvent() {
            const events = ['rapidfire', 'skilltest', 'combo', 'frenzy'];
            const event = events[Math.floor(Math.random() * events.length)];

            switch(event) {
                case 'rapidfire':
                    startRapidFireEvent();
                    break;
                case 'skilltest':
                    startSkillTestEvent();
                    break;
                case 'combo':
                    startComboEvent();
                    break;
                case 'frenzy':
                    startFrenzyEvent();
                    break;
            }
        }

        // 🔥 RAPID FIRE: 5 questions, many targets, fast pace!
        function startRapidFireEvent() {
            currentEvent = EVENTS.BONUS;
            eventState.questionsRemaining = 5;
            eventState.correctInEvent = 0;
            eventState.eventStartTime = performance.now();

            showFeedback('🔥 RAPID FIRE! 5問連続!', '#ff6600');
            playSFX('levelup');

            // Generate first rapid fire question
            STATE.currentQuestion = generateQuestion();
            spawnRapidFireTargets();
            updateHUD();
        }

        function spawnRapidFireTargets() {
            // Clear existing
            STATE.targets.forEach(t => t.visible = false);
            STATE.targets = [];

            const q = STATE.currentQuestion;
            // Spawn 5-7 targets with ONLY ONE correct answer
            const targetCount = 5 + Math.floor(Math.random() * 3);

            // Get wrong numbers (exclude the answer)
            const wrongNumbers = q.allNumbers.filter(n => n !== q.answer);

            // IMPORTANT: Create answer target first
            let answerCreated = false;

            for (let i = 0; i < targetCount; i++) {
                const target = getTarget();
                if (!target) {
                    if (!answerCreated) {
                        console.error('Failed to create answer target in rapid fire!');
                    }
                    continue;
                }

                // First target is the correct answer, rest are wrong
                const isCorrect = (i === 0);
                if (isCorrect) answerCreated = true;
                const number = isCorrect ? q.answer : wrongNumbers[i % wrongNumbers.length];

                const color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
                target.material.color.setHex(color);
                target.material.emissive.setHex(color);
                target.material.emissiveIntensity = 0.4;

                // Spread across screen
                const x = (Math.random() - 0.5) * 18;
                const y = -3 + Math.random() * 8;
                target.position.set(x, y, -8 - Math.random() * 4);
                target.scale.set(0.8, 1.0, 0.8);

                const sprite = target.userData.sprite;
                sprite.material.map = getNumberTexture(number);
                sprite.material.needsUpdate = true;
                sprite.scale.set(1.8, 1.8, 1);

                target.userData = {
                    number,
                    isAnswer: isCorrect,
                    isStrategy: false,
                    velocity: new THREE.Vector3(
                        (Math.random() - 0.5) * 0.03,
                        0.015 + Math.random() * 0.015,
                        (Math.random() - 0.5) * 0.01
                    ),
                    sprite,
                    pulsePhase: Math.random() * Math.PI * 2
                };

                target.visible = true;
                STATE.targets.push(target);
            }
        }

        // 📊 SKILL TEST: 3 questions from one category to measure skill
        function startSkillTestEvent() {
            currentEvent = EVENTS.GOLDEN;
            eventState.questionsRemaining = 3;
            eventState.correctInEvent = 0;

            // Pick the category with lowest skill for practice
            const categories = Object.entries(SKILL_CATEGORIES);
            categories.sort((a, b) => a[1].level - b[1].level);
            eventState.targetCategory = categories[0][0];

            const catNames = {
                addition: '足し算', subtraction: '引き算',
                multiplication: '掛け算', division: '割り算', units: '単位'
            };

            showFeedback(`📊 ${catNames[eventState.targetCategory]}テスト! 3問`, '#00ffff');
            playSFX('levelup');

            // Generate question from target category
            generateSkillTestQuestion();
            spawnTargets();
            updateHUD();
        }

        function generateSkillTestQuestion() {
            const cat = eventState.targetCategory;
            const skillLevel = SKILL_CATEGORIES[cat].level;

            // Get questions from this category at appropriate level
            let available = QUESTION_TEMPLATES.filter(t =>
                t.category === cat &&
                t.skillLevel >= skillLevel - 1 &&
                t.skillLevel <= skillLevel + 2
            );

            if (available.length === 0) {
                available = QUESTION_TEMPLATES.filter(t => t.category === cat);
            }

            const template = available[Math.floor(Math.random() * available.length)];
            const q = template.generate();
            q.questionType = template.type;

            // Generate distractors
            const distractors = new Set();
            let attempts = 0;
            while (distractors.size < 3 && attempts < 20) {
                attempts++;
                let d;
                if (q.answer >= 1000) {
                    const mult = [100, 500, 1000, 1500, 2000, 2500, 3000];
                    d = mult[Math.floor(Math.random() * mult.length)];
                } else if (q.answer >= 100) {
                    d = Math.max(10, q.answer + (Math.floor(Math.random() * 5) - 2) * 50);
                } else {
                    d = Math.max(1, q.answer + Math.floor(Math.random() * 10) - 5);
                }
                if (d !== q.answer && d > 0) distractors.add(d);
            }

            q.allNumbers = [q.answer, ...Array.from(distractors)].slice(0, 5);
            STATE.currentQuestion = q;
        }

        // 🎯 COMBO CHALLENGE: Get 5 correct in a row!
        function startComboEvent() {
            currentEvent = EVENTS.SPEED;
            eventState.questionsRemaining = 5;
            eventState.correctInEvent = 0;

            showFeedback('🎯 COMBO! 5連続正解せよ!', '#ff00ff');
            playSFX('levelup');

            STATE.currentQuestion = generateQuestion();
            spawnTargets();
            updateHUD();
        }

        // 🌟 FRENZY: Many small targets, find the ONE correct answer!
        function startFrenzyEvent() {
            currentEvent = EVENTS.FRENZY;
            eventState.questionsRemaining = 3;  // 3 rounds of frenzy
            eventState.correctInEvent = 0;

            showFeedback('🌟 FRENZY! 正解を探せ!', '#ffd700');
            playSFX('levelup');

            STATE.currentQuestion = generateQuestion();
            spawnFrenzyTargets();
            updateHUD();
        }

        function spawnFrenzyTargets() {
            STATE.targets.forEach(t => t.visible = false);
            STATE.targets = [];

            const q = STATE.currentQuestion;
            // Spawn 8-10 targets, ONLY ONE is correct
            const totalCount = 8 + Math.floor(Math.random() * 3);

            // Get wrong numbers
            const wrongNumbers = q.allNumbers.filter(n => n !== q.answer);

            // IMPORTANT: Create answer target first
            spawnFrenzyTarget(q.answer, true);

            for (let i = 1; i < totalCount; i++) {
                // All others are wrong
                const number = wrongNumbers[i % wrongNumbers.length];
                spawnFrenzyTarget(number, false);
            }
        }

        function spawnFrenzyTarget(number, isCorrect) {
            const target = getTarget();
            if (!target) {
                if (isCorrect) {
                    console.error('Failed to create answer target in frenzy!');
                }
                return;
            }

            const color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
            target.material.color.setHex(color);
            target.material.emissive.setHex(color);
            target.material.emissiveIntensity = 0.3;

            const x = (Math.random() - 0.5) * 18;
            const y = -4 + Math.random() * 9;
            target.position.set(x, y, -7 - Math.random() * 5);
            target.scale.set(0.7, 0.85, 0.7);  // Small targets

            const sprite = target.userData.sprite;
            sprite.material.map = getNumberTexture(number);
            sprite.material.needsUpdate = true;
            sprite.scale.set(1.5, 1.5, 1);

            target.userData = {
                number,
                isAnswer: isCorrect,
                isStrategy: false,
                isFrenzy: true,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.025,
                    0.01 + Math.random() * 0.02,
                    (Math.random() - 0.5) * 0.015
                ),
                sprite,
                pulsePhase: Math.random() * Math.PI * 2
            };

            target.visible = true;
            STATE.targets.push(target);
        }

        // Boss battle event - Enhanced!
        function triggerBossEvent() {
            currentEvent = EVENTS.BOSS;
            bossHealth = 3 + currentWorld;
            eventState.correctInEvent = 0;

            showFeedback('👹 BOSS BATTLE!', '#ff0000');
            playSFX('levelup');
            spawnBossWithMinions();
        }

        function spawnBossWithMinions() {
            STATE.targets.forEach(t => t.visible = false);
            STATE.targets = [];

            const q = STATE.currentQuestion;

            // Spawn boss (correct answer)
            const boss = getTarget();
            if (boss) {
                boss.material.color.setHex(0xff0000);
                boss.material.emissive.setHex(0xff0000);
                boss.material.emissiveIntensity = 0.8;
                boss.position.set(0, 2, -10);
                boss.scale.set(2.2, 2.8, 2.2);

                const sprite = boss.userData.sprite;
                sprite.material.map = getNumberTexture(q.answer);
                sprite.material.needsUpdate = true;
                sprite.scale.set(2.5, 2.5, 1);

                boss.userData = {
                    number: q.answer,
                    isAnswer: true,
                    isBoss: true,
                    velocity: new THREE.Vector3(0.015, 0.008, 0),
                    sprite,
                    pulsePhase: 0
                };
                boss.visible = true;
                STATE.targets.push(boss);
            }

            // Spawn 2-3 minions (wrong answers) that block the boss
            const minionCount = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < minionCount; i++) {
                const minion = getTarget();
                if (!minion) continue;

                const wrongNum = q.allNumbers.find(n => n !== q.answer) || q.answer + i + 1;
                const color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
                minion.material.color.setHex(color);
                minion.material.emissive.setHex(color);
                minion.material.emissiveIntensity = 0.3;

                const angle = (i / minionCount) * Math.PI * 2;
                minion.position.set(Math.cos(angle) * 4, 1 + Math.sin(angle) * 2, -8);
                minion.scale.set(1, 1.2, 1);

                const sprite = minion.userData.sprite;
                sprite.material.map = getNumberTexture(wrongNum);
                sprite.material.needsUpdate = true;
                sprite.scale.set(1.8, 1.8, 1);

                minion.userData = {
                    number: wrongNum,
                    isAnswer: false,
                    isMinion: true,
                    velocity: new THREE.Vector3(
                        (Math.random() - 0.5) * 0.02,
                        (Math.random() - 0.5) * 0.015,
                        0
                    ),
                    sprite,
                    pulsePhase: Math.random() * Math.PI * 2
                };
                minion.visible = true;
                STATE.targets.push(minion);
            }
        }

        // Handle event completion
        function handleEventHit(isCorrect) {
            if (currentEvent === EVENTS.NORMAL) return false;

            if (isCorrect) {
                eventState.correctInEvent++;
            }

            // RAPID FIRE: continue to next question
            if (currentEvent === EVENTS.BONUS && eventState.questionsRemaining > 0) {
                eventState.questionsRemaining--;
                if (eventState.questionsRemaining > 0) {
                    STATE.currentQuestion = generateQuestion();
                    spawnRapidFireTargets();
                    updateHUD();
                    return true;
                } else {
                    // Event complete!
                    const bonus = eventState.correctInEvent * 50;
                    showFeedback(`🔥 RAPID完了! +${bonus}`, '#ff6600');
                    STATE.player.score += bonus;
                    currentEvent = EVENTS.NORMAL;
                }
            }

            // SKILL TEST: continue to next question
            if (currentEvent === EVENTS.GOLDEN && eventState.questionsRemaining > 0) {
                eventState.questionsRemaining--;
                if (eventState.questionsRemaining > 0 && isCorrect) {
                    generateSkillTestQuestion();
                    spawnTargets();
                    updateHUD();
                    return true;
                } else {
                    // Event complete - update skill more aggressively
                    const cat = eventState.targetCategory;
                    if (eventState.correctInEvent >= 2) {
                        SKILL_CATEGORIES[cat].level = Math.min(10, SKILL_CATEGORIES[cat].level + 1);
                        showFeedback(`📊 ${cat} UP! Lv${SKILL_CATEGORIES[cat].level}`, '#00ffff');
                    } else if (eventState.correctInEvent === 0) {
                        SKILL_CATEGORIES[cat].level = Math.max(1, SKILL_CATEGORIES[cat].level - 1);
                    }
                    currentEvent = EVENTS.NORMAL;
                }
            }

            // COMBO: must get all correct in a row
            if (currentEvent === EVENTS.SPEED) {
                if (!isCorrect) {
                    showFeedback('💔 COMBO BREAK!', '#ff0000');
                    currentEvent = EVENTS.NORMAL;
                } else {
                    eventState.questionsRemaining--;
                    if (eventState.questionsRemaining > 0) {
                        STATE.currentQuestion = generateQuestion();
                        spawnTargets();
                        updateHUD();
                        return true;
                    } else {
                        // Combo complete!
                        const bonus = 300;
                        showFeedback(`🎯 PERFECT COMBO! +${bonus}`, '#ff00ff');
                        STATE.player.score += bonus;
                        currentEvent = EVENTS.NORMAL;
                    }
                }
            }

            // FRENZY: 3 rounds, find the one correct answer each round
            if (currentEvent === EVENTS.FRENZY && isCorrect) {
                eventState.questionsRemaining--;
                if (eventState.questionsRemaining > 0) {
                    // Next frenzy round
                    STATE.currentQuestion = generateQuestion();
                    spawnFrenzyTargets();
                    updateHUD();
                    return true;
                } else {
                    // Frenzy complete!
                    const bonus = eventState.correctInEvent * 50;
                    showFeedback(`🌟 FRENZY完了! +${bonus}`, '#ffd700');
                    STATE.player.score += bonus;
                    currentEvent = EVENTS.NORMAL;
                }
            }

            return false;
        }

        function nextQuestion() {
            STATE.questionIndex++;

            // Check for stage completion
            if (STATE.questionIndex >= CONFIG.QUESTIONS_PER_STAGE) {
                completeStage();
                return;
            }

            // Random events (every 3 questions)
            if (STATE.questionIndex > 0 && STATE.questionIndex % 3 === 0) {
                triggerRandomEvent();
                return;  // Event handles its own questions
            }

            // Boss at end of each stage
            if (STATE.questionIndex === CONFIG.QUESTIONS_PER_STAGE - 1) {
                STATE.currentQuestion = generateQuestion();
                triggerBossEvent();
                updateHUD();
                return;
            }

            STATE.currentQuestion = generateQuestion();
            spawnTargets();
            updateHUD();
        }

        function completeStage() {
            // Add stage score to total
            totalScore += STATE.player.score;
            stagesCompleted++;

            const world = WORLDS[currentWorld];

            // Check if world completed
            if (currentStage >= world.stages) {
                // Move to next world
                currentWorld++;
                currentStage = 1;

                if (currentWorld >= WORLDS.length) {
                    // Game complete!
                    endGame(true);
                    return;
                }

                // Show world transition
                showWorldTransition();
            } else {
                // Next stage in same world
                currentStage++;
                showStageTransition();
            }
        }

        function showStageTransition() {
            STATE.isPaused = true;

            const overlay = document.createElement('div');
            overlay.className = 'overlay';
            overlay.id = 'stageTransition';
            overlay.innerHTML = `
                <h1>🎉 Stage Clear!</h1>
                <p>Score: ${STATE.player.score} pts</p>
                <p>Streak: 🔥${STATE.player.bestStreak}</p>
                <p style="font-size:1.5rem;margin-top:1rem;">Next: Stage ${currentStage}</p>
                <button class="btn" onclick="continueGame()">Continue →</button>
            `;
            document.body.appendChild(overlay);
        }

        function showWorldTransition() {
            STATE.isPaused = true;

            const nextWorld = WORLDS[currentWorld];
            const overlay = document.createElement('div');
            overlay.className = 'overlay';
            overlay.id = 'worldTransition';
            overlay.innerHTML = `
                <h1>🏆 World Complete!</h1>
                <p>Total Score: ${totalScore} pts</p>
                <p style="font-size:2rem;margin:1.5rem 0;">${nextWorld.name}</p>
                <p>新しい世界へ！難易度がアップ！</p>
                <button class="btn" onclick="continueGame()">Enter World →</button>
            `;
            document.body.appendChild(overlay);

            // Increase difficulty
            STATE.difficultyLevel = Math.min(7, STATE.difficultyLevel + 1);
        }

        function continueGame() {
            // Remove transition overlay
            document.getElementById('stageTransition')?.remove();
            document.getElementById('worldTransition')?.remove();

            // Reset stage score but keep total
            STATE.player.score = 0;
            STATE.player.streak = 0;
            STATE.player.shots = 0;
            STATE.player.hits = 0;
            STATE.questionIndex = 0;
            STATE.timeLeft = CONFIG.TIME_LIMIT;
            currentEvent = EVENTS.NORMAL;

            STATE.currentQuestion = generateQuestion();
            spawnTargets();
            updateHUD();

            STATE.isPaused = false;
            STATE.gameStartTime = performance.now();
        }

        function endGame(victory) {
            STATE.isRunning = false;
            saveBestScores();
            showFinalResults(victory);
        }

        function showFinalResults(victory) {
            const overlay = document.createElement('div');
            overlay.className = 'overlay';
            overlay.id = 'finalResults';

            if (victory) {
                overlay.innerHTML = `
                    <h1>🎊 CONGRATULATIONS! 🎊</h1>
                    <p style="font-size:1.5rem;">すべてのワールドをクリア！</p>
                    <p>Final Score: ${totalScore} pts</p>
                    <p>Stages Completed: ${stagesCompleted}</p>
                    <p>Best Streak: 🔥${STATE.player.bestStreak}</p>
                    <div class="btn-group">
                        <button class="btn" onclick="startNewGame()">New Game</button>
                        <button class="btn" onclick="startEndlessMode()">Endless Mode</button>
                    </div>
                `;
            } else {
                overlay.innerHTML = `
                    <h1>⏰ Time's Up!</h1>
                    <p>World: ${WORLDS[currentWorld].name}</p>
                    <p>Stage: ${currentStage}</p>
                    <p>Total Score: ${totalScore} pts</p>
                    <div class="btn-group">
                        <button class="btn" onclick="retryStage()">Retry Stage</button>
                        <button class="btn" onclick="startNewGame()">New Game</button>
                    </div>
                `;
            }

            document.body.appendChild(overlay);
        }

        function retryStage() {
            document.getElementById('finalResults')?.remove();
            STATE.player.score = 0;
            STATE.player.streak = 0;
            STATE.questionIndex = 0;
            currentEvent = EVENTS.NORMAL;
            startGame();
        }

        function startNewGame() {
            document.getElementById('finalResults')?.remove();
            currentWorld = 0;
            currentStage = 1;
            totalScore = 0;
            stagesCompleted = 0;
            STATE.difficultyLevel = 1;
            startGame();
        }

        function startEndlessMode() {
            document.getElementById('finalResults')?.remove();
            currentWorld = WORLDS.length - 1;  // Champion world
            currentStage = 999;  // Endless indicator
            STATE.difficultyLevel = 7;
            startGame();
        }

        function endRound() {
            // Time ran out
            endGame(false);
        }

        function saveBestScores() {
            try {
                const scores = JSON.parse(localStorage.getItem('mathShootingBest') || '[]');
                scores.push({
                    score: STATE.player.score,
                    streak: STATE.player.bestStreak,
                    accuracy: STATE.player.accuracy,
                    date: new Date().toLocaleDateString()
                });
                scores.sort((a, b) => b.score - a.score);
                localStorage.setItem('mathShootingBest', JSON.stringify(scores.slice(0, 20)));
                STATE.bestScores = scores;
            } catch (e) {}
        }

        function showRanking() {
            const ranking = document.getElementById('rankingDisplay');
            ranking.innerHTML = '';

            const current = {
                score: STATE.player.score,
                streak: STATE.player.bestStreak,
                accuracy: STATE.player.accuracy,
                current: true
            };

            const all = [current, ...STATE.bestScores.slice(0, 4)];

            all.forEach((p, i) => {
                const entry = document.createElement('div');
                entry.className = `ranking-entry rank-${i + 1}`;
                if (p.current) entry.classList.add('current');

                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                entry.innerHTML = `<span>${medal} ${p.current ? 'NOW' : p.date || ''}</span><span>${p.score}pts 🔥${p.streak} 🎯${p.accuracy}%</span>`;
                ranking.appendChild(entry);
            });

            showOverlay('rankingOverlay');
        }

        // ============================================
        // GAME LOOP (OPTIMIZED)
        // ============================================
        let frameCount = 0;
        function gameLoop(timestamp) {
            if (!STATE.isRunning || STATE.isPaused) {
                if (STATE.isRunning) requestAnimationFrame(gameLoop);
                return;
            }

            // Debug: log first few frames
            if (frameCount < 3) {
                console.log('[GameLoop] Frame', frameCount, 'targets:', STATE.targets.length);
                frameCount++;
            }

            const deltaTime = Math.min((timestamp - STATE.lastRenderTime) / 1000, 0.1);
            STATE.lastRenderTime = timestamp;

            const elapsed = (timestamp - STATE.gameStartTime) / 1000;
            STATE.timeLeft = Math.max(0, CONFIG.TIME_LIMIT - elapsed);

            if (STATE.timeLeft <= 0) {
                endRound();
                return;
            }

            // Update all systems
            updateTargets(deltaTime);
            updateParticles(deltaTime);
            interpolateAllCrosshairs();
            updateScreenShake();
            updateBgFlash();
            updateHUD();

            // Render
            if (STATE.renderer && STATE.scene && STATE.camera) {
                STATE.renderer.render(STATE.scene, STATE.camera);
            }
            requestAnimationFrame(gameLoop);
        }

        // OPTIMIZED: Use RAF for detection too
        let lastDetection = 0;
        const detectionInterval = 1000 / CONFIG.DETECTION_FPS;
        let detectionErrors = 0;
        const MAX_DETECTION_ERRORS = 5;

        function detectionLoop(timestamp) {
            if (!STATE.isRunning || STATE.isPaused) {
                if (STATE.isRunning) requestAnimationFrame(detectionLoop);
                return;
            }

            // Wait for model and video to be ready
            if (!STATE.modelReady || !STATE.hands || !STATE.videoElement || STATE.videoElement.readyState < 2) {
                requestAnimationFrame(detectionLoop);
                return;
            }

            if (timestamp - lastDetection >= detectionInterval) {
                STATE.hands.send({ image: STATE.videoElement }).then(() => {
                    updateHandGestures();
                    detectionErrors = 0;  // Reset error count on success
                }).catch(e => {
                    console.warn('Detection error:', e);
                    detectionErrors++;

                    // If too many errors, try to recover
                    if (detectionErrors >= MAX_DETECTION_ERRORS) {
                        console.warn('[Detection] Too many errors, attempting recovery...');
                        detectionErrors = 0;
                        // Reset hand data to show "no hand detected"
                        STATE.handsData = [];
                        updateHandStatus(false);
                    }
                });
                lastDetection = timestamp;
            }

            requestAnimationFrame(detectionLoop);
        }

        // ============================================
        // GAME LIFECYCLE
        // ============================================
        // ユーザーがゲームスタートボタンを押したときに呼ばれる
        async function requestStart() {
            try {
                console.log('[requestStart] Starting initialization...');

                // スタートオーバーレイを非表示
                const startOverlay = document.getElementById('startOverlay');
                if (startOverlay) {
                    startOverlay.classList.add('hidden');
                }

                // カメラと手認識を初期化
                await initMediaPipe();

                // ゲームを開始
                await startGame();

            } catch (error) {
                console.error('[requestStart] Failed:', error);

                // エラーを表示
                const startOverlay = document.getElementById('startOverlay');
                if (startOverlay) {
                    startOverlay.classList.remove('hidden');
                }

                const welcomeText = document.getElementById('welcomeText');
                if (welcomeText) {
                    welcomeText.innerHTML = `<span style="color: #ff4444;">エラー: ${error.message}</span><br><small>カメラへのアクセスを許可してください</small>`;
                }
            }
        }

        // ゲームを最初から再スタート
        function restartGame() {
            // すべてのオーバーレイを非表示
            hideAllOverlays();
            // ゲームを再開始
            startGame();
        }

        async function startGame() {
            try {
                console.log('[Game] Starting...');

                // Load saved skills
                loadSkills();

                // Initialize 3D scene first (always needed)
                if (!STATE.scene) {
                    console.log('[Game] Initializing Three.js...');
                    initThreeJS();
                }

                // Show HUD and render first frame immediately
                document.getElementById('hud').classList.remove('hidden');
                hideAllOverlays();

                // Initialize audio (non-blocking)
                if (!STATE.audioContext) {
                    initAudio().catch(e => console.warn('Audio init failed:', e));
                }

                // Reset game state
                STATE.questionIndex = 0;
                STATE.timeLeft = CONFIG.TIME_LIMIT;
                STATE.difficultyLevel = 1;
                STATE.handState = { state: 'idle', cooldownEnd: 0 };

                STATE.player.score = 0;
                STATE.player.streak = 0;
                STATE.player.bestStreak = 0;
                STATE.player.accuracy = 0;
                STATE.player.shots = 0;
                STATE.player.hits = 0;

                // Generate question and spawn targets
                STATE.currentQuestion = generateQuestion();
                console.log('[Game] Question:', STATE.currentQuestion);
                spawnTargets();
                updateHUD();

                // Start game loop immediately (renders 3D scene)
                STATE.isRunning = true;
                STATE.isPaused = false;
                STATE.gameStartTime = performance.now();
                STATE.lastRenderTime = STATE.gameStartTime;

                console.log('[Game] Starting game loop...');
                requestAnimationFrame(gameLoop);

                // Initialize MediaPipe in background (non-blocking)
                if (!STATE.modelReady) {
                    console.log('[Game] Initializing MediaPipe in background...');
                    initMediaPipe().then(() => {
                        console.log('[Game] MediaPipe ready, starting detection loop');
                        requestAnimationFrame(detectionLoop);
                    }).catch(error => {
                        console.error('[Game] MediaPipe failed:', error);
                        showStrategyHint('カメラを許可してください');
                    });
                } else {
                    requestAnimationFrame(detectionLoop);
                }

            } catch (error) {
                console.error('[Game] Fatal error:', error);

                // エラーメッセージを表示
                const errorMsg = document.getElementById('errorMessage');
                if (errorMsg) {
                    errorMsg.textContent = error.message;
                    showOverlay('errorOverlay');
                } else {
                    // errorOverlayが存在しない場合はstartOverlayにエラーを表示
                    const startOverlay = document.getElementById('startOverlay');
                    const welcomeText = document.getElementById('welcomeText');
                    if (startOverlay && welcomeText) {
                        startOverlay.classList.remove('hidden');
                        welcomeText.innerHTML = `<span style="color: #ff4444;">エラー: ${error.message}</span><br><small>ページを再読み込みしてください</small>`;
                    }
                }
            }
        }

        function nextRound() {
            startGame();
        }

        // ============================================
        // PAGE VISIBILITY
        // ============================================
        document.addEventListener('visibilitychange', () => {
            STATE.isPaused = document.hidden;
            if (STATE.audioContext) {
                document.hidden ? STATE.audioContext.suspend() : STATE.audioContext.resume();
            }
        });

        // ============================================
        // INITIALIZATION
        // ============================================
        window.addEventListener('load', () => {
            try {
                STATE.bestScores = JSON.parse(localStorage.getItem('mathShootingBest') || '[]');
            } catch (e) {
                STATE.bestScores = [];
            }

            // Setup audio unlock (browsers require user interaction)
            setupAudioUnlock();

            // 自動開始を無効化（ユーザーがゲームスタートボタンを押すのを待つ）
            // setTimeout(startGame, 50);  // 削除：学年選択機能のため
        });

        // Prevent scroll/zoom
        document.body.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

        // ============================================
        // TOUCH/CLICK CONTROLS (FALLBACK)
        // ============================================
        function handlePointerShoot(clientX, clientY) {
            if (!STATE.isRunning || STATE.isPaused) return;

            console.log('[Touch] Tap at', clientX, clientY);

            // Convert screen position to NDC (-1 to 1)
            const ndcX = (clientX / window.innerWidth) * 2 - 1;
            const ndcY = -(clientY / window.innerHeight) * 2 + 1;

            // Direct raycast from screen position
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), STATE.camera);

            // Show crosshair at ray intersection point
            const rayDir = raycaster.ray.direction.clone();
            const rayOrigin = raycaster.ray.origin.clone();
            const targetZ = -10;  // Where balloons are
            const t = (targetZ - rayOrigin.z) / rayDir.z;
            const hitPoint = rayOrigin.add(rayDir.multiplyScalar(t));

            // Move and show first crosshair for touch/click
            if (STATE.crosshairs[0]) {
                STATE.crosshairs[0].position.set(hitPoint.x, hitPoint.y, targetZ + 2);
                STATE.crosshairs[0].visible = true;
                STATE.crosshairs[0].lookAt(STATE.camera.position);
                setCrosshairColor(0, 0xff0000);  // Red when shooting
            }

            // Play sound
            playSFX('shoot');
            STATE.player.shots++;

            // Check for hits
            const intersects = raycaster.intersectObjects(STATE.targets.filter(t => t.visible), true);

            console.log('[Touch] Intersects:', intersects.length);

            if (intersects.length > 0) {
                // Find the balloon (parent of sprite if we hit sprite)
                let target = intersects[0].object;
                while (target.parent && !STATE.targets.includes(target)) {
                    target = target.parent;
                }
                if (STATE.targets.includes(target)) {
                    handleHit(target);
                } else {
                    showFeedback('MISS', '#888');
                    playSFX('miss');
                }
            } else {
                showFeedback('MISS', '#888');
                playSFX('miss');
            }

            // Hide crosshair after a moment
            setTimeout(() => {
                if (STATE.crosshairs[0]) {
                    setCrosshairColor(0, 0x00ff00);  // Back to green (hand 0 color)
                    if (!STATE.modelReady) {
                        STATE.crosshairs[0].visible = false;
                    }
                }
            }, 200);
        }

        // Touch support - with iOS audio unlock
        document.getElementById('gameCanvas').addEventListener('touchstart', e => {
            e.preventDefault();

            // iOS requires audio context creation in touch handler
            if (!STATE.audioContext) {
                try {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    STATE.audioContext = new AudioContext();
                    STATE.audioReady = true;
                    console.log('[Touch] Created AudioContext, state:', STATE.audioContext.state);
                    unlockAudioForIOS();
                } catch (err) {
                    console.warn('[Touch] AudioContext creation failed:', err);
                }
            }
            if (STATE.audioContext && STATE.audioContext.state === 'suspended') {
                STATE.audioContext.resume();
            }

            const touch = e.touches[0];
            handlePointerShoot(touch.clientX, touch.clientY);
        }, { passive: false });

        // Mouse/click support
        document.getElementById('gameCanvas').addEventListener('click', e => {
            handlePointerShoot(e.clientX, e.clientY);
        });

        // Prevent double-tap zoom
        let lastTap = 0;
        document.addEventListener('touchend', e => {
            const now = Date.now();
            if (now - lastTap < 300) e.preventDefault();
            lastTap = now;
        });

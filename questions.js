// 学年別問題データ - 日本の小学校算数カリキュラムに基づく
// 各学年のカリキュラムに沿った問題テンプレートを提供

const GRADE_CURRICULUMS = {
    // ========================================
    // 1年生: 1〜100の数、たし算・ひき算
    // ========================================
    1: {
        name: '1年生',
        description: 'たし算・ひき算の基礎',
        emoji: '🌱',
        categories: {
            addition: { level: 1, correct: 0, total: 0 },
            subtraction: { level: 1, correct: 0, total: 0 }
        },
        templates: [
            // たし算 (1桁 + 1桁) - 絵文字で楽しく
            {
                type: 'addition_1digit',
                category: 'addition',
                skillLevel: 1,
                generate: () => {
                    const a = 1 + Math.floor(Math.random() * 9);
                    const b = 1 + Math.floor(Math.random() * (10 - a));
                    const emojis = ['🍎', '🍊', '🍌', '🍇', '🍓', '⚽', '🎈', '⭐', '🌸', '🦋'];
                    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                    return {
                        question: `${emoji} ${a} + ${b} = ?`,
                        answer: a + b,
                        strategy: [],
                        hint: '指で数えてもいいよ！'
                    };
                }
            },
            // 10をつくる - 計算のコツ！
            {
                type: 'addition_make10',
                category: 'addition',
                skillLevel: 2,
                generate: () => {
                    const a = 6 + Math.floor(Math.random() * 4);
                    const toTen = 10 - a;
                    return {
                        question: `💡 ${a} + ${toTen}`,
                        answer: 10,
                        strategy: [10],
                        hint: `${a}と${toTen}で10！`
                    };
                }
            },
            // くり上がりのあるたし算 - 10のかたまり戦略
            {
                type: 'addition_carry',
                category: 'addition',
                skillLevel: 3,
                generate: () => {
                    const a = 7 + Math.floor(Math.random() * 3);
                    const b = 4 + Math.floor(Math.random() * 5);
                    const toTen = 10 - a;
                    const remain = b - toTen;
                    return {
                        question: `🎯 ${a} + ${b}`,
                        answer: a + b,
                        strategy: [10, 10 + remain],
                        hint: `${a}+${toTen}=10、10+${remain}`
                    };
                }
            },
            // ひき算 (1桁) - お菓子の問題
            {
                type: 'subtraction_1digit',
                category: 'subtraction',
                skillLevel: 1,
                generate: () => {
                    const a = 5 + Math.floor(Math.random() * 5);
                    const b = 1 + Math.floor(Math.random() * a);
                    const items = ['🍪クッキー', '🍬あめ', '🎁プレゼント', '📚本'];
                    const item = items[Math.floor(Math.random() * items.length)];
                    return {
                        question: `${item}${a}個−${b}個`,
                        answer: a - b,
                        strategy: [],
                        hint: '残りはいくつ？'
                    };
                }
            },
            // 10からひく - 補数を覚えよう
            {
                type: 'subtraction_from10',
                category: 'subtraction',
                skillLevel: 2,
                generate: () => {
                    const b = 1 + Math.floor(Math.random() * 9);
                    const ans = 10 - b;
                    return {
                        question: `🔟 10 − ${b}`,
                        answer: ans,
                        strategy: [ans],
                        hint: `${b}と${ans}で10！`
                    };
                }
            },
            // くり下がりのあるひき算 - 10のかたまり戦略
            {
                type: 'subtraction_borrow',
                category: 'subtraction',
                skillLevel: 3,
                generate: () => {
                    const a = 11 + Math.floor(Math.random() * 8);
                    const b = 3 + Math.floor(Math.random() * 7);
                    if (a - b < 0 || a % 10 >= b) return this.generate();
                    const tens = Math.floor(a / 10) * 10;
                    const ones = a % 10;
                    return {
                        question: `🎲 ${a} − ${b}`,
                        answer: a - b,
                        strategy: [tens, 10 - b + ones],
                        hint: `10から${b}をひいて、${ones}をたす`
                    };
                }
            },
            // 実生活：お金の問題
            {
                type: 'money_simple',
                category: 'addition',
                skillLevel: 2,
                generate: () => {
                    const a = Math.floor(Math.random() * 5) + 1;
                    const b = Math.floor(Math.random() * 5) + 1;
                    return {
                        question: `💰 ${a}円+${b}円`,
                        answer: a + b,
                        strategy: [],
                        hint: '全部でいくら？'
                    };
                }
            }
        ]
    },

    // ========================================
    // 2年生: 3桁までの数、九九、長さ・時間
    // ========================================
    2: {
        name: '2年生',
        description: '九九と3桁の計算',
        emoji: '🌿',
        categories: {
            addition: { level: 2, correct: 0, total: 0 },
            subtraction: { level: 2, correct: 0, total: 0 },
            multiplication: { level: 1, correct: 0, total: 0 },
            units: { level: 1, correct: 0, total: 0 }
        },
        templates: [
            // お金の問題：おつり計算
            {
                type: 'money_change',
                category: 'subtraction',
                skillLevel: 1,
                generate: () => {
                    const prices = [30, 40, 50, 60, 70];
                    const price = prices[Math.floor(Math.random() * prices.length)];
                    const paid = 100;
                    return {
                        question: `💴 100円で${price}円のおかし、おつりは？`,
                        answer: paid - price,
                        strategy: [100 - price],
                        hint: '100円から引こう'
                    };
                }
            },
            // 2桁のたし算 - キリの良い数に
            {
                type: 'addition_2digit',
                category: 'addition',
                skillLevel: 1,
                generate: () => {
                    const a = 20 + Math.floor(Math.random() * 70);
                    const b = 10 + Math.floor(Math.random() * 30);
                    const roundA = Math.round(a / 10) * 10;
                    const diff = a - roundA;
                    return {
                        question: `🧮 ${a} + ${b}`,
                        answer: a + b,
                        strategy: [roundA, roundA + b, roundA + b + diff],
                        hint: `${a}≒${roundA}で計算`
                    };
                }
            },
            // 3桁のたし算 - 100のかたまり
            {
                type: 'addition_3digit',
                category: 'addition',
                skillLevel: 3,
                generate: () => {
                    const a = 100 + Math.floor(Math.random() * 400);
                    const b = 50 + Math.floor(Math.random() * 200);
                    const hundreds = Math.floor((a + b) / 100) * 100;
                    return {
                        question: `🎯 ${a} + ${b}`,
                        answer: a + b,
                        strategy: [hundreds],
                        hint: '100のかたまりで考えよう'
                    };
                }
            },
            // 九九 (簡単) - 絵文字で楽しく
            {
                type: 'multiplication_easy',
                category: 'multiplication',
                skillLevel: 1,
                generate: () => {
                    const tables = [2, 3, 4, 5];
                    const a = tables[Math.floor(Math.random() * tables.length)];
                    const b = 1 + Math.floor(Math.random() * 9);
                    const contexts = [
                        { emoji: '🍎', item: 'りんご' },
                        { emoji: '🍪', item: 'クッキー' },
                        { emoji: '⚽', item: 'ボール' },
                        { emoji: '📚', item: '本' }
                    ];
                    const ctx = contexts[Math.floor(Math.random() * contexts.length)];
                    return {
                        question: `${ctx.emoji} ${a}×${b}`,
                        answer: a * b,
                        strategy: [],
                        hint: `${a}の段！`
                    };
                }
            },
            // 九九 (難しい) - 7,8,9の段
            {
                type: 'multiplication_hard',
                category: 'multiplication',
                skillLevel: 2,
                generate: () => {
                    const hard = [7, 8, 9];
                    const a = hard[Math.floor(Math.random() * hard.length)];
                    const b = 6 + Math.floor(Math.random() * 4);  // 6〜9
                    return {
                        question: `💪 ${a} × ${b}`,
                        answer: a * b,
                        strategy: [(a * 5), (a * 5) + (a * (b - 5))],
                        hint: `${a}×5=${a * 5}から考える`
                    };
                }
            },
            // 長さ：定規の問題
            {
                type: 'length_cm_m',
                category: 'units',
                skillLevel: 1,
                generate: () => {
                    const m = 1 + Math.floor(Math.random() * 5);
                    return {
                        question: `📏 ${m}m = ?cm`,
                        answer: m * 100,
                        strategy: [100, m * 100],
                        hint: '1m=100cm だよ'
                    };
                }
            },
            // 時間の問題
            {
                type: 'time_calculation',
                category: 'addition',
                skillLevel: 2,
                generate: () => {
                    const start = [30, 45, 15, 20];
                    const duration = [15, 30, 20, 10];
                    const s = start[Math.floor(Math.random() * start.length)];
                    const d = duration[Math.floor(Math.random() * duration.length)];
                    return {
                        question: `⏰ ${s}分+${d}分`,
                        answer: s + d,
                        strategy: [],
                        hint: '時計で考えよう'
                    };
                }
            },
            // 買い物の問題
            {
                type: 'shopping',
                category: 'addition',
                skillLevel: 2,
                generate: () => {
                    const items = [
                        { name: '🍫チョコ', price: 80 },
                        { name: '🍬あめ', price: 50 },
                        { name: '🍪クッキー', price: 120 },
                        { name: '🧃ジュース', price: 100 }
                    ];
                    const item1 = items[Math.floor(Math.random() * items.length)];
                    let item2 = items[Math.floor(Math.random() * items.length)];
                    while (item2.name === item1.name) {
                        item2 = items[Math.floor(Math.random() * items.length)];
                    }
                    const total = item1.price + item2.price;
                    return {
                        question: `🛒 ${item1.name}${item1.price}円と${item2.name}${item2.price}円`,
                        answer: total,
                        strategy: [Math.round(total / 10) * 10],
                        hint: '合計いくら？'
                    };
                }
            },
            // 九九の逆算
            {
                type: 'division_intro',
                category: 'multiplication',
                skillLevel: 3,
                generate: () => {
                    const a = 2 + Math.floor(Math.random() * 7);  // 2-8
                    const b = 2 + Math.floor(Math.random() * 7);  // 2-8
                    const answer = a * b;
                    return {
                        question: `❓ ${answer} ÷ ${a}`,
                        answer: b,
                        strategy: [a * b],
                        hint: `${a}×?=${answer}`
                    };
                }
            }
        ]
    },

    // ========================================
    // 3年生: かけ算・わり算、小数・分数の導入
    // ========================================
    3: {
        name: '3年生',
        description: 'かけ算・わり算と小数',
        emoji: '🌳',
        categories: {
            addition: { level: 3, correct: 0, total: 0 },
            subtraction: { level: 3, correct: 0, total: 0 },
            multiplication: { level: 2, correct: 0, total: 0 },
            division: { level: 1, correct: 0, total: 0 },
            units: { level: 2, correct: 0, total: 0 }
        },
        templates: [
            // ×5のコツ - 10の半分
            {
                type: 'multiplication_5trick',
                category: 'multiplication',
                skillLevel: 2,
                generate: () => {
                    const b = 12 + Math.floor(Math.random() * 17);  // 12-28
                    const trick = b * 10;
                    return {
                        question: `💡 ${b} × 5`,
                        answer: b * 5,
                        strategy: [trick, trick / 2],
                        hint: `${b}×10=${trick}の半分！`
                    };
                }
            },
            // ×9のコツ - 10から引く
            {
                type: 'multiplication_9trick',
                category: 'multiplication',
                skillLevel: 2,
                generate: () => {
                    const b = 11 + Math.floor(Math.random() * 9);  // 11-19
                    return {
                        question: `🎯 ${b} × 9`,
                        answer: b * 9,
                        strategy: [b * 10, b * 10 - b],
                        hint: `${b}×10=${b * 10}から${b}を引く`
                    };
                }
            },
            // 2桁×1桁 - 分解
            {
                type: 'multiplication_2digit_1digit',
                category: 'multiplication',
                skillLevel: 1,
                generate: () => {
                    const a = 11 + Math.floor(Math.random() * 19);  // 11-29
                    const b = 3 + Math.floor(Math.random() * 6);     // 3-8
                    const tens = Math.floor(a / 10) * 10;
                    const ones = a % 10;
                    return {
                        question: `📐 ${a} × ${b}`,
                        answer: a * b,
                        strategy: [tens * b, ones * b, tens * b + ones * b],
                        hint: `${tens}×${b}+${ones}×${b}`
                    };
                }
            },
            // わり算：等分の問題
            {
                type: 'division_equal',
                category: 'division',
                skillLevel: 1,
                generate: () => {
                    const people = 3 + Math.floor(Math.random() * 6);  // 3-8人
                    const each = 4 + Math.floor(Math.random() * 7);     // 4-10個
                    const total = people * each;
                    const emojis = ['🍎', '🍬', '⚽', '📚', '🍪'];
                    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                    return {
                        question: `${emoji}${total}個÷${people}人`,
                        answer: each,
                        strategy: [people * each],
                        hint: '1人何個？'
                    };
                }
            },
            // わり算：あまりあり
            {
                type: 'division_remainder',
                category: 'division',
                skillLevel: 2,
                generate: () => {
                    const divisor = 3 + Math.floor(Math.random() * 6);   // 3-8
                    const quotient = 4 + Math.floor(Math.random() * 7);  // 4-10
                    const remainder = 1 + Math.floor(Math.random() * (divisor - 1));
                    const dividend = divisor * quotient + remainder;
                    return {
                        question: `🎲 ${dividend} ÷ ${divisor}...あまり?`,
                        answer: remainder,
                        strategy: [divisor * quotient],
                        hint: `${divisor}×${quotient}=${divisor * quotient}`
                    };
                }
            },
            // 重さの実生活問題
            {
                type: 'weight_real',
                category: 'units',
                skillLevel: 1,
                generate: () => {
                    const items = [
                        { name: '🍎りんご', weight: 200 },
                        { name: '📚本', weight: 500 },
                        { name: '⚽ボール', weight: 400 }
                    ];
                    const item = items[Math.floor(Math.random() * items.length)];
                    const count = 2 + Math.floor(Math.random() * 4);  // 2-5個
                    return {
                        question: `⚖️ ${item.name}${item.weight}g×${count}個`,
                        answer: item.weight * count,
                        strategy: [item.weight * count],
                        hint: '全部で何g？'
                    };
                }
            },
            // 長さの計算
            {
                type: 'length_calculation',
                category: 'addition',
                skillLevel: 2,
                generate: () => {
                    const a = 50 + Math.floor(Math.random() * 150);  // 50-199cm
                    const b = 30 + Math.floor(Math.random() * 100);  // 30-129cm
                    return {
                        question: `📏 ${a}cm+${b}cm=?m`,
                        answer: Math.floor((a + b) / 100),
                        strategy: [a + b],
                        hint: '100cm=1m'
                    };
                }
            },
            // 買い物：複数商品
            {
                type: 'shopping_multi',
                category: 'multiplication',
                skillLevel: 2,
                generate: () => {
                    const price = [50, 60, 70, 80, 90];
                    const p = price[Math.floor(Math.random() * price.length)];
                    const count = 3 + Math.floor(Math.random() * 5);  // 3-7個
                    return {
                        question: `🛒 ${p}円×${count}個`,
                        answer: p * count,
                        strategy: [p * count],
                        hint: '全部でいくら？'
                    };
                }
            },
            // 時間の計算
            {
                type: 'time_real',
                category: 'subtraction',
                skillLevel: 2,
                generate: () => {
                    const start = 8 + Math.floor(Math.random() * 3);  // 8-10時
                    const end = 12 + Math.floor(Math.random() * 3);   // 12-14時
                    return {
                        question: `🕐 ${start}時〜${end}時`,
                        answer: end - start,
                        strategy: [end - start],
                        hint: '何時間？'
                    };
                }
            }
        ]
    },

    // ========================================
    // 4年生: 大きな数、小数・分数、面積
    // ========================================
    4: {
        name: '4年生',
        description: '小数・分数と面積',
        emoji: '🌲',
        categories: {
            addition: { level: 4, correct: 0, total: 0 },
            subtraction: { level: 4, correct: 0, total: 0 },
            multiplication: { level: 3, correct: 0, total: 0 },
            division: { level: 2, correct: 0, total: 0 },
            decimal: { level: 1, correct: 0, total: 0 },
            units: { level: 3, correct: 0, total: 0 }
        },
        templates: [
            // 億、兆の数
            {
                type: 'large_numbers',
                category: 'addition',
                skillLevel: 1,
                generate: () => {
                    const a = 1000 + Math.floor(Math.random() * 9000);
                    const b = 500 + Math.floor(Math.random() * 5000);
                    return { question: `${a} + ${b}`, answer: a + b, strategy: [], hint: '' };
                }
            },
            // 2桁×2桁
            {
                type: 'multiplication_2digit',
                category: 'multiplication',
                skillLevel: 1,
                generate: () => {
                    const a = 11 + Math.floor(Math.random() * 9);
                    const b = 11 + Math.floor(Math.random() * 9);
                    return { question: `${a} × ${b}`, answer: a * b, strategy: [], hint: '筆算でやろう' };
                }
            },
            // かけ算の工夫 (25×4=100)
            {
                type: 'multiplication_25trick',
                category: 'multiplication',
                skillLevel: 2,
                generate: () => {
                    const n = 1 + Math.floor(Math.random() * 9);
                    return { question: `25 × ${n * 4}`, answer: 25 * n * 4, strategy: [100 * n], hint: '25×4=100' };
                }
            },
            // わり算 (3桁÷2桁)
            {
                type: 'division_3digit',
                category: 'division',
                skillLevel: 1,
                generate: () => {
                    const answer = 5 + Math.floor(Math.random() * 20);
                    const b = 11 + Math.floor(Math.random() * 9);
                    return { question: `${answer * b} ÷ ${b}`, answer, strategy: [], hint: '' };
                }
            },
            // 小数のたし算
            {
                type: 'decimal_addition',
                category: 'decimal',
                skillLevel: 1,
                generate: () => {
                    const a = (1 + Math.floor(Math.random() * 9)) + (Math.floor(Math.random() * 9)) / 10;
                    const b = (1 + Math.floor(Math.random() * 9)) + (Math.floor(Math.random() * 9)) / 10;
                    const answer = Math.round((a + b) * 10) / 10;
                    return { question: `${a.toFixed(1)} + ${b.toFixed(1)}`, answer, strategy: [], hint: '小数点をそろえよう' };
                }
            },
            // 小数のひき算
            {
                type: 'decimal_subtraction',
                category: 'decimal',
                skillLevel: 1,
                generate: () => {
                    const a = (5 + Math.floor(Math.random() * 5)) + (Math.floor(Math.random() * 9)) / 10;
                    const b = (1 + Math.floor(Math.random() * 4)) + (Math.floor(Math.random() * 9)) / 10;
                    const answer = Math.round((a - b) * 10) / 10;
                    return { question: `${a.toFixed(1)} − ${b.toFixed(1)}`, answer, strategy: [], hint: '小数点をそろえよう' };
                }
            },
            // 面積 (長方形)
            {
                type: 'area_rectangle',
                category: 'units',
                skillLevel: 1,
                generate: () => {
                    const w = 5 + Math.floor(Math.random() * 15);
                    const h = 5 + Math.floor(Math.random() * 15);
                    return { question: `長方形：縦${h}cm、横${w}cm の面積は?`, answer: w * h, strategy: [], hint: '縦×横' };
                }
            },
            // 面積 (正方形)
            {
                type: 'area_square',
                category: 'units',
                skillLevel: 1,
                generate: () => {
                    const s = 5 + Math.floor(Math.random() * 15);
                    return { question: `正方形：1辺${s}cm の面積は?`, answer: s * s, strategy: [], hint: '1辺×1辺' };
                }
            }
        ]
    },

    // ========================================
    // 5年生: 分数の計算、倍数・約数、体積
    // ========================================
    5: {
        name: '5年生',
        description: '分数と体積',
        emoji: '🏔️',
        categories: {
            multiplication: { level: 4, correct: 0, total: 0 },
            division: { level: 3, correct: 0, total: 0 },
            decimal: { level: 2, correct: 0, total: 0 },
            fraction: { level: 1, correct: 0, total: 0 },
            units: { level: 4, correct: 0, total: 0 }
        },
        templates: [
            // 小数×整数
            {
                type: 'decimal_multiplication',
                category: 'decimal',
                skillLevel: 1,
                generate: () => {
                    const a = (1 + Math.floor(Math.random() * 9)) + (Math.floor(Math.random() * 9)) / 10;
                    const b = 2 + Math.floor(Math.random() * 8);
                    const answer = Math.round(a * b * 10) / 10;
                    return { question: `${a.toFixed(1)} × ${b}`, answer, strategy: [], hint: '' };
                }
            },
            // 小数÷整数
            {
                type: 'decimal_division',
                category: 'decimal',
                skillLevel: 1,
                generate: () => {
                    const b = 2 + Math.floor(Math.random() * 8);
                    const answer = (1 + Math.floor(Math.random() * 9)) + (Math.floor(Math.random() * 9)) / 10;
                    const a = Math.round(answer * b * 10) / 10;
                    return { question: `${a.toFixed(1)} ÷ ${b}`, answer, strategy: [], hint: '' };
                }
            },
            // 約数
            {
                type: 'divisors',
                category: 'multiplication',
                skillLevel: 1,
                generate: () => {
                    const nums = [12, 18, 24, 30, 36, 40, 48];
                    const n = nums[Math.floor(Math.random() * nums.length)];
                    const divisors = [];
                    for (let i = 1; i <= n; i++) {
                        if (n % i === 0) divisors.push(i);
                    }
                    const answer = divisors.length;
                    return { question: `${n}の約数は何個?`, answer, strategy: [], hint: `1から${n}まで調べよう` };
                }
            },
            // 倍数
            {
                type: 'multiples',
                category: 'multiplication',
                skillLevel: 1,
                generate: () => {
                    const n = 3 + Math.floor(Math.random() * 7);
                    const k = 5 + Math.floor(Math.random() * 6);
                    return { question: `${n}の${k}番目の倍数は?`, answer: n * k, strategy: [], hint: `${n}×${k}` };
                }
            },
            // 分数のたし算 (同分母)
            {
                type: 'fraction_addition_same',
                category: 'fraction',
                skillLevel: 1,
                generate: () => {
                    const denom = 5 + Math.floor(Math.random() * 5);
                    const a = 1 + Math.floor(Math.random() * (denom - 2));
                    const b = 1 + Math.floor(Math.random() * (denom - a - 1));
                    return { question: `${a}/${denom} + ${b}/${denom}`, answer: a + b, strategy: [], hint: '分母はそのまま' };
                }
            },
            // 分数のひき算 (同分母)
            {
                type: 'fraction_subtraction_same',
                category: 'fraction',
                skillLevel: 1,
                generate: () => {
                    const denom = 5 + Math.floor(Math.random() * 5);
                    const a = 3 + Math.floor(Math.random() * (denom - 3));
                    const b = 1 + Math.floor(Math.random() * (a - 1));
                    return { question: `${a}/${denom} − ${b}/${denom}`, answer: a - b, strategy: [], hint: '分母はそのまま' };
                }
            },
            // 体積 (直方体)
            {
                type: 'volume_cuboid',
                category: 'units',
                skillLevel: 1,
                generate: () => {
                    const l = 2 + Math.floor(Math.random() * 8);
                    const w = 2 + Math.floor(Math.random() * 8);
                    const h = 2 + Math.floor(Math.random() * 8);
                    return { question: `直方体：縦${l}cm、横${w}cm、高さ${h}cm の体積は?`, answer: l * w * h, strategy: [], hint: '縦×横×高さ' };
                }
            },
            // 体積 (立方体)
            {
                type: 'volume_cube',
                category: 'units',
                skillLevel: 1,
                generate: () => {
                    const s = 2 + Math.floor(Math.random() * 8);
                    return { question: `立方体：1辺${s}cm の体積は?`, answer: s * s * s, strategy: [], hint: '1辺×1辺×1辺' };
                }
            },
            // 平均
            {
                type: 'average',
                category: 'division',
                skillLevel: 1,
                generate: () => {
                    const nums = [];
                    for (let i = 0; i < 5; i++) {
                        nums.push(10 + Math.floor(Math.random() * 40));
                    }
                    const sum = nums.reduce((a, b) => a + b, 0);
                    const avg = sum / nums.length;
                    return { question: `${nums.join(', ')} の平均は?`, answer: avg, strategy: [sum], hint: '合計÷個数' };
                }
            }
        ]
    },

    // ========================================
    // 6年生: 分数の乗除、比、速さ、比例
    // ========================================
    6: {
        name: '6年生',
        description: '分数の計算と比・速さ',
        emoji: '🎓',
        categories: {
            multiplication: { level: 5, correct: 0, total: 0 },
            division: { level: 4, correct: 0, total: 0 },
            fraction: { level: 2, correct: 0, total: 0 },
            ratio: { level: 1, correct: 0, total: 0 },
            speed: { level: 1, correct: 0, total: 0 },
            units: { level: 5, correct: 0, total: 0 }
        },
        templates: [
            // 分数×整数
            {
                type: 'fraction_multiplication',
                category: 'fraction',
                skillLevel: 1,
                generate: () => {
                    const denom = 3 + Math.floor(Math.random() * 7);
                    const numer = 1 + Math.floor(Math.random() * (denom - 1));
                    const mult = 2 + Math.floor(Math.random() * 5);
                    const answerNumer = numer * mult;
                    return { question: `${numer}/${denom} × ${mult}`, answer: answerNumer, strategy: [], hint: '分子だけかける' };
                }
            },
            // 分数÷整数
            {
                type: 'fraction_division',
                category: 'fraction',
                skillLevel: 1,
                generate: () => {
                    const div = 2 + Math.floor(Math.random() * 4);
                    const numer = div * (1 + Math.floor(Math.random() * 5));
                    const denom = 3 + Math.floor(Math.random() * 7);
                    const answerNumer = numer / div;
                    return { question: `${numer}/${denom} ÷ ${div}`, answer: answerNumer, strategy: [], hint: '分子だけわる' };
                }
            },
            // 分数のたし算 (異分母)
            {
                type: 'fraction_addition_diff',
                category: 'fraction',
                skillLevel: 2,
                generate: () => {
                    const denoms = [[2, 4], [3, 6], [2, 3], [3, 9], [4, 8]];
                    const pair = denoms[Math.floor(Math.random() * denoms.length)];
                    const denom1 = pair[0];
                    const denom2 = pair[1];
                    const numer1 = 1;
                    const numer2 = 1;
                    const lcm = denom2; // simplified for these pairs
                    const answer = Math.round((numer1 * (lcm / denom1) + numer2 * (lcm / denom2)));
                    return { question: `${numer1}/${denom1} + ${numer2}/${denom2}`, answer, strategy: [lcm], hint: '通分しよう' };
                }
            },
            // 比
            {
                type: 'ratio_simple',
                category: 'ratio',
                skillLevel: 1,
                generate: () => {
                    const a = 2 + Math.floor(Math.random() * 8);
                    const b = 2 + Math.floor(Math.random() * 8);
                    const mult = 2 + Math.floor(Math.random() * 5);
                    return { question: `${a}:${b} = ${a * mult}:?`, answer: b * mult, strategy: [], hint: `×${mult}` };
                }
            },
            // 比の値
            {
                type: 'ratio_value',
                category: 'ratio',
                skillLevel: 1,
                generate: () => {
                    const denoms = [2, 3, 4, 5];
                    const denom = denoms[Math.floor(Math.random() * denoms.length)];
                    const numer = 1 + Math.floor(Math.random() * (denom - 1));
                    const answer = numer / denom;
                    return { question: `${numer}:${denom} の比の値は? (小数で)`, answer, strategy: [], hint: `${numer}÷${denom}` };
                }
            },
            // 速さ
            {
                type: 'speed_distance',
                category: 'speed',
                skillLevel: 1,
                generate: () => {
                    const speed = 40 + Math.floor(Math.random() * 60);
                    const time = 2 + Math.floor(Math.random() * 4);
                    return { question: `時速${speed}kmで${time}時間進むと?`, answer: speed * time, strategy: [], hint: '速さ×時間' };
                }
            },
            // 速さ (時間を求める)
            {
                type: 'speed_time',
                category: 'speed',
                skillLevel: 2,
                generate: () => {
                    const speed = 40 + Math.floor(Math.random() * 60);
                    const time = 2 + Math.floor(Math.random() * 4);
                    const distance = speed * time;
                    return { question: `${distance}kmを時速${speed}kmで進むと何時間?`, answer: time, strategy: [], hint: '道のり÷速さ' };
                }
            },
            // 速さ (速度を求める)
            {
                type: 'speed_velocity',
                category: 'speed',
                skillLevel: 2,
                generate: () => {
                    const speed = 40 + Math.floor(Math.random() * 60);
                    const time = 2 + Math.floor(Math.random() * 4);
                    const distance = speed * time;
                    return { question: `${distance}kmを${time}時間で進むと時速?`, answer: speed, strategy: [], hint: '道のり÷時間' };
                }
            },
            // 円の面積
            {
                type: 'circle_area',
                category: 'units',
                skillLevel: 1,
                generate: () => {
                    const r = 5 + Math.floor(Math.random() * 10);
                    const answer = Math.round(r * r * 3.14 * 10) / 10;
                    return { question: `半径${r}cmの円の面積は? (円周率3.14)`, answer, strategy: [r * r], hint: '半径×半径×3.14' };
                }
            },
            // 円の円周
            {
                type: 'circle_circumference',
                category: 'units',
                skillLevel: 1,
                generate: () => {
                    const r = 5 + Math.floor(Math.random() * 10);
                    const answer = Math.round(2 * r * 3.14 * 10) / 10;
                    return { question: `半径${r}cmの円の円周は? (円周率3.14)`, answer, strategy: [2 * r], hint: '直径×3.14' };
                }
            }
        ]
    }
};

// カテゴリーから問題タイプを判定するヘルパー関数
function getCategory(type) {
    if (type.includes('addition')) return 'addition';
    if (type.includes('subtraction')) return 'subtraction';
    if (type.includes('multiplication') || type.includes('square') || type.includes('double') || type.includes('divisors') || type.includes('multiples')) return 'multiplication';
    if (type.includes('division') || type.includes('average')) return 'division';
    if (type.includes('decimal')) return 'decimal';
    if (type.includes('fraction')) return 'fraction';
    if (type.includes('ratio')) return 'ratio';
    if (type.includes('speed')) return 'speed';
    if (type.includes('volume') || type.includes('length') || type.includes('weight') || type.includes('area') || type.includes('circle')) return 'units';
    return 'addition';  // default
}

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
            // たし算 (1桁 + 1桁)
            {
                type: 'addition_1digit',
                category: 'addition',
                skillLevel: 1,
                generate: () => {
                    const a = 1 + Math.floor(Math.random() * 9);
                    const b = 1 + Math.floor(Math.random() * (10 - a));
                    return { question: `${a} + ${b}`, answer: a + b, strategy: [], hint: '' };
                }
            },
            // 10をつくる
            {
                type: 'addition_make10',
                category: 'addition',
                skillLevel: 2,
                generate: () => {
                    const a = 6 + Math.floor(Math.random() * 4);
                    const toTen = 10 - a;
                    return { question: `${a} + ${toTen}`, answer: 10, strategy: [10], hint: `10をつくろう！` };
                }
            },
            // くり上がりのあるたし算
            {
                type: 'addition_carry',
                category: 'addition',
                skillLevel: 3,
                generate: () => {
                    const a = 7 + Math.floor(Math.random() * 3);
                    const b = 4 + Math.floor(Math.random() * 5);
                    return { question: `${a} + ${b}`, answer: a + b, strategy: [10], hint: `10をつくって考えよう` };
                }
            },
            // ひき算 (1桁)
            {
                type: 'subtraction_1digit',
                category: 'subtraction',
                skillLevel: 1,
                generate: () => {
                    const a = 5 + Math.floor(Math.random() * 5);
                    const b = 1 + Math.floor(Math.random() * a);
                    return { question: `${a} − ${b}`, answer: a - b, strategy: [], hint: '' };
                }
            },
            // 10からひく
            {
                type: 'subtraction_from10',
                category: 'subtraction',
                skillLevel: 2,
                generate: () => {
                    const b = 1 + Math.floor(Math.random() * 9);
                    return { question: `10 − ${b}`, answer: 10 - b, strategy: [], hint: '10からひこう' };
                }
            },
            // くり下がりのあるひき算
            {
                type: 'subtraction_borrow',
                category: 'subtraction',
                skillLevel: 3,
                generate: () => {
                    const a = 11 + Math.floor(Math.random() * 8);
                    const b = 3 + Math.floor(Math.random() * 7);
                    if (a - b < 0) return this.generate();
                    return { question: `${a} − ${b}`, answer: a - b, strategy: [10], hint: '10をつかって考えよう' };
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
            // 2桁のたし算
            {
                type: 'addition_2digit',
                category: 'addition',
                skillLevel: 1,
                generate: () => {
                    const a = 10 + Math.floor(Math.random() * 90);
                    const b = 1 + Math.floor(Math.random() * 50);
                    return { question: `${a} + ${b}`, answer: a + b, strategy: [], hint: '' };
                }
            },
            // くり上がりのある2桁のたし算
            {
                type: 'addition_2digit_carry',
                category: 'addition',
                skillLevel: 2,
                generate: () => {
                    const a = 25 + Math.floor(Math.random() * 50);
                    const b = 15 + Math.floor(Math.random() * 40);
                    return { question: `${a} + ${b}`, answer: a + b, strategy: [], hint: 'くり上がりに注意！' };
                }
            },
            // 3桁のたし算
            {
                type: 'addition_3digit',
                category: 'addition',
                skillLevel: 3,
                generate: () => {
                    const a = 100 + Math.floor(Math.random() * 400);
                    const b = 50 + Math.floor(Math.random() * 300);
                    return { question: `${a} + ${b}`, answer: a + b, strategy: [], hint: '' };
                }
            },
            // 2桁のひき算
            {
                type: 'subtraction_2digit',
                category: 'subtraction',
                skillLevel: 1,
                generate: () => {
                    const a = 30 + Math.floor(Math.random() * 70);
                    const b = 5 + Math.floor(Math.random() * (a - 10));
                    return { question: `${a} − ${b}`, answer: a - b, strategy: [], hint: '' };
                }
            },
            // くり下がりのある2桁のひき算
            {
                type: 'subtraction_2digit_borrow',
                category: 'subtraction',
                skillLevel: 2,
                generate: () => {
                    const a = 40 + Math.floor(Math.random() * 60);
                    const ones = (a % 10) + 2;
                    const b = 10 + Math.min(ones, 9);
                    return { question: `${a} − ${b}`, answer: a - b, strategy: [], hint: 'くり下がりに注意！' };
                }
            },
            // 九九 (2の段〜5の段)
            {
                type: 'multiplication_2to5',
                category: 'multiplication',
                skillLevel: 1,
                generate: () => {
                    const a = 2 + Math.floor(Math.random() * 4);
                    const b = 1 + Math.floor(Math.random() * 9);
                    return { question: `${a} × ${b}`, answer: a * b, strategy: [], hint: `${a}の段` };
                }
            },
            // 九九 (6の段〜9の段)
            {
                type: 'multiplication_6to9',
                category: 'multiplication',
                skillLevel: 2,
                generate: () => {
                    const a = 6 + Math.floor(Math.random() * 4);
                    const b = 1 + Math.floor(Math.random() * 9);
                    return { question: `${a} × ${b}`, answer: a * b, strategy: [], hint: `${a}の段` };
                }
            },
            // 長さ (cm と m)
            {
                type: 'length_cm_m',
                category: 'units',
                skillLevel: 1,
                generate: () => {
                    const m = 1 + Math.floor(Math.random() * 5);
                    return { question: `${m}m = ?cm`, answer: m * 100, strategy: [100], hint: '1m=100cm' };
                }
            },
            // かさ (L と dL)
            {
                type: 'volume_L_dL',
                category: 'units',
                skillLevel: 1,
                generate: () => {
                    const L = 1 + Math.floor(Math.random() * 5);
                    return { question: `${L}L = ?dL`, answer: L * 10, strategy: [10], hint: '1L=10dL' };
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
            // 大きな数のたし算
            {
                type: 'addition_large',
                category: 'addition',
                skillLevel: 1,
                generate: () => {
                    const a = 100 + Math.floor(Math.random() * 900);
                    const b = 100 + Math.floor(Math.random() * 500);
                    return { question: `${a} + ${b}`, answer: a + b, strategy: [], hint: '' };
                }
            },
            // 大きな数のひき算
            {
                type: 'subtraction_large',
                category: 'subtraction',
                skillLevel: 1,
                generate: () => {
                    const a = 200 + Math.floor(Math.random() * 800);
                    const b = 50 + Math.floor(Math.random() * (a - 100));
                    return { question: `${a} − ${b}`, answer: a - b, strategy: [], hint: '' };
                }
            },
            // 2桁×1桁
            {
                type: 'multiplication_2digit_1digit',
                category: 'multiplication',
                skillLevel: 1,
                generate: () => {
                    const a = 11 + Math.floor(Math.random() * 9);
                    const b = 2 + Math.floor(Math.random() * 8);
                    return { question: `${a} × ${b}`, answer: a * b, strategy: [10 * b], hint: `10×${b}から考えよう` };
                }
            },
            // かけ算の工夫 (×5)
            {
                type: 'multiplication_5trick',
                category: 'multiplication',
                skillLevel: 2,
                generate: () => {
                    const b = 11 + Math.floor(Math.random() * 9);
                    return { question: `${b} × 5`, answer: b * 5, strategy: [b * 10], hint: `${b}×10÷2` };
                }
            },
            // かけ算の工夫 (×9)
            {
                type: 'multiplication_9trick',
                category: 'multiplication',
                skillLevel: 2,
                generate: () => {
                    const b = 11 + Math.floor(Math.random() * 9);
                    return { question: `${b} × 9`, answer: b * 9, strategy: [b * 10], hint: `${b}×10−${b}` };
                }
            },
            // わり算 (九九の範囲)
            {
                type: 'division_simple',
                category: 'division',
                skillLevel: 1,
                generate: () => {
                    const answer = 2 + Math.floor(Math.random() * 8);
                    const b = 2 + Math.floor(Math.random() * 9);
                    const a = answer * b;
                    return { question: `${a} ÷ ${b}`, answer, strategy: [], hint: `${b}×?=${a}` };
                }
            },
            // わり算 (2桁÷1桁)
            {
                type: 'division_2digit',
                category: 'division',
                skillLevel: 2,
                generate: () => {
                    const answer = 5 + Math.floor(Math.random() * 10);
                    const b = 2 + Math.floor(Math.random() * 6);
                    return { question: `${answer * b} ÷ ${b}`, answer, strategy: [], hint: '' };
                }
            },
            // 重さ (kg と g)
            {
                type: 'weight_kg_g',
                category: 'units',
                skillLevel: 1,
                generate: () => {
                    const kg = 1 + Math.floor(Math.random() * 5);
                    return { question: `${kg}kg = ?g`, answer: kg * 1000, strategy: [1000], hint: '1kg=1000g' };
                }
            },
            // 長さ (mm, cm, m)
            {
                type: 'length_3units',
                category: 'units',
                skillLevel: 2,
                generate: () => {
                    const choices = [
                        { q: () => {
                            const cm = 1 + Math.floor(Math.random() * 20);
                            return { question: `${cm}cm = ?mm`, answer: cm * 10, hint: '1cm=10mm' };
                        }},
                        { q: () => {
                            const m = 1 + Math.floor(Math.random() * 5);
                            return { question: `${m}m = ?cm`, answer: m * 100, hint: '1m=100cm' };
                        }}
                    ];
                    const choice = choices[Math.floor(Math.random() * choices.length)];
                    const result = choice.q();
                    return { question: result.question, answer: result.answer, strategy: [], hint: result.hint };
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

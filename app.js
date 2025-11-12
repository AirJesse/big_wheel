// 奖品配置，包含概率、图标和配色
const prizes = [
    { name: '1积分', probability: 50, image: 'images/1point.svg', color: '#FF6B6B' },
    { name: '2积分', probability: 30, image: 'images/2point.svg', color: '#4ECDC4' },
    { name: '5积分', probability: 15, image: 'images/5point.svg', color: '#FFE66D' },
    { name: '神秘玩具', probability: 5, image: 'images/mystery.svg', color: '#1A535C' }
];

// DOM 元素
const wheel = document.getElementById('wheel');
const spinBtn = document.getElementById('spinBtn');
const stopBtn = document.getElementById('stopBtn');
const resultModal = document.getElementById('resultModal');
const resultImage = document.getElementById('resultImage');
const resultText = document.getElementById('resultText');
const closeModal = document.getElementById('closeBtn');

// 转盘状态
const state = {
    segments: [],
    segmentAngle: 0,
    gradientOffset: 0,
    isSpinning: false,
    isStopping: false,
    animationFrame: null,
    speed: 0,
    currentRotation: 0,
    targetRotation: 0,
    selectedSegmentIndex: null
};

const DESIRED_SEGMENT_COUNT = 20; // 需要的区块数量（保持大于 10）
const MIN_EXTRA_SPINS = 3; // 停止时至少再多转几圈
const ACCELERATION = 0.35;
const MAX_SPEED = 18;

function normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360;
}

function tintColor(hexColor, factor) {
    const hex = hexColor.replace('#', '');
    const num = parseInt(hex, 16);

    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;

    if (factor >= 0) {
        r += (255 - r) * factor;
        g += (255 - g) * factor;
        b += (255 - b) * factor;
    } else {
        r *= 1 + factor;
        g *= 1 + factor;
        b *= 1 + factor;
    }

    const toHex = (value) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0');

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function findSegmentIndexByRotation(rotation) {
    if (!state.segments.length) {
        return 0;
    }

    const normalizedRotation = normalizeAngle(rotation);
    const pointerRaw = normalizeAngle(90 - normalizedRotation);
    const pointerNormalized = normalizeAngle(pointerRaw - state.gradientOffset);
    const index = Math.floor(pointerNormalized / state.segmentAngle);

    return ((index % state.segments.length) + state.segments.length) % state.segments.length;
}

function allocateSegments(totalSegments) {
    const allocations = prizes.map(prize => ({
        prize,
        count: Math.max(1, Math.round((prize.probability / 100) * totalSegments))
    }));

    let total = allocations.reduce((sum, item) => sum + item.count, 0);

    while (total > totalSegments) {
        const candidate = allocations
            .filter(item => item.count > 1)
            .sort((a, b) => a.prize.probability - b.prize.probability || a.count - b.count)[0];

        if (!candidate) {
            break;
        }

        candidate.count -= 1;
        total -= 1;
    }

    while (total < totalSegments) {
        const candidate = allocations.sort((a, b) => b.prize.probability - a.prize.probability)[0];
        candidate.count += 1;
        total += 1;
    }

    return allocations;
}

function buildSegments() {
    const totalSegments = Math.max(DESIRED_SEGMENT_COUNT, prizes.length);
    const allocations = allocateSegments(totalSegments);
    const segments = [];
    const pool = allocations.map(({ prize, count }) => ({ prize, remaining: count }));

    while (segments.length < totalSegments) {
        pool.sort((a, b) => b.remaining - a.remaining || b.prize.probability - a.prize.probability);
        let placed = false;

        for (const item of pool) {
            if (item.remaining <= 0) {
                continue;
            }

            if (segments.length > 0 && segments[segments.length - 1].name === item.prize.name) {
                continue;
            }

            segments.push({ ...item.prize });
            item.remaining -= 1;
            placed = true;
            break;
        }

        if (!placed) {
            const fallback = pool.find(item => item.remaining > 0);
            if (!fallback) {
                break;
            }

            segments.push({ ...fallback.prize });
            fallback.remaining -= 1;
        }
    }

    state.segments = segments;
    state.segmentAngle = 360 / segments.length;
    state.gradientOffset = 90 - state.segmentAngle / 2;
}

function renderWheel() {
    wheel.innerHTML = '';

    const gradientStops = [];

    state.segments.forEach((segment, index) => {
        const start = index * state.segmentAngle;
        const end = start + state.segmentAngle;
        const shade = index % 2 === 0 ? tintColor(segment.color, 0.12) : tintColor(segment.color, -0.12);
        gradientStops.push(`${shade} ${start}deg ${end}deg`);

        const label = document.createElement('div');
        label.className = 'segment-label';
        const angle = start + state.segmentAngle / 2;
        label.style.setProperty('--angle', `${angle}deg`);

        const image = document.createElement('img');
        image.src = segment.image;
        image.alt = segment.name;

        const text = document.createElement('span');
        text.textContent = segment.name;

        label.appendChild(image);
        label.appendChild(text);
        wheel.appendChild(label);
    });

    wheel.style.background = `conic-gradient(from ${state.gradientOffset}deg, ${gradientStops.join(', ')})`;
}

function step() {
    if (!state.isSpinning) {
        return;
    }

    if (state.speed < MAX_SPEED) {
        state.speed = Math.min(MAX_SPEED, state.speed + ACCELERATION);
    }

    state.currentRotation += state.speed;
    wheel.style.transform = `rotate(${state.currentRotation}deg)`;
    state.animationFrame = requestAnimationFrame(step);
}

function startSpinning() {
    if (state.isSpinning || state.isStopping) {
        return;
    }

    state.isSpinning = true;
    state.isStopping = false;
    state.speed = 0;
    spinBtn.disabled = true;
    stopBtn.disabled = false;

    wheel.style.transition = 'none';
    cancelAnimationFrame(state.animationFrame);
    state.animationFrame = null;
    state.animationFrame = requestAnimationFrame(step);
}

function computeTargetRotation(segmentIndex) {
    const targetNormalized = segmentIndex * state.segmentAngle + state.segmentAngle / 2;
    const pointerRaw = state.gradientOffset + targetNormalized;
    const alignmentAngle = normalizeAngle(90 - pointerRaw);

    let target = alignmentAngle;
    const minTarget = state.currentRotation + MIN_EXTRA_SPINS * 360;

    while (target <= minTarget) {
        target += 360;
    }

    if (target <= state.currentRotation) {
        target += 360;
    }

    return target;
}

function stopSpinning() {
    if (!state.isSpinning || state.isStopping) {
        return;
    }

    state.isStopping = true;
    state.isSpinning = false;
    stopBtn.disabled = true;

    cancelAnimationFrame(state.animationFrame);
    state.animationFrame = null;

    const selectedSegmentIndex = Math.floor(Math.random() * state.segments.length);
    state.selectedSegmentIndex = selectedSegmentIndex;
    state.targetRotation = computeTargetRotation(selectedSegmentIndex);

    const resolvedIndex = findSegmentIndexByRotation(state.targetRotation);
    if (resolvedIndex !== selectedSegmentIndex) {
        const difference = (selectedSegmentIndex - resolvedIndex + state.segments.length) % state.segments.length;
        state.targetRotation += difference * state.segmentAngle;
    }

    requestAnimationFrame(() => {
        wheel.style.transition = 'transform 4.5s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
        wheel.style.transform = `rotate(${state.targetRotation}deg)`;
    });
}

function showResult() {
    const segment = state.segments[state.selectedSegmentIndex];

    resultImage.src = segment.image;
    resultImage.alt = segment.name;
    resultText.textContent = `恭喜你获得了${segment.name}！`;

    resultModal.style.display = 'flex';
}

function resetWheel() {
    resultModal.style.display = 'none';
    spinBtn.disabled = false;
    stopBtn.disabled = true;

    cancelAnimationFrame(state.animationFrame);
    state.animationFrame = null;
    state.isSpinning = false;
    state.isStopping = false;
    state.speed = 0;
    state.selectedSegmentIndex = null;

    wheel.style.transition = 'none';

    const randomOffset = Math.random() * 360;
    state.currentRotation = randomOffset;
    state.targetRotation = randomOffset;
    wheel.style.transform = `rotate(${randomOffset}deg)`;
}

wheel.addEventListener('transitionend', (event) => {
    if (event.propertyName !== 'transform' || !state.isStopping) {
        return;
    }

    state.isStopping = false;
    state.currentRotation = state.targetRotation;
    wheel.style.transition = 'none';

    const resolvedIndex = findSegmentIndexByRotation(state.currentRotation);
    state.selectedSegmentIndex = resolvedIndex;

    showResult();
});

spinBtn.addEventListener('click', startSpinning);
stopBtn.addEventListener('click', stopSpinning);
closeModal.addEventListener('click', resetWheel);

resultModal.addEventListener('click', (event) => {
    if (event.target === resultModal) {
        resetWheel();
    }
});

buildSegments();
renderWheel();
resetWheel();

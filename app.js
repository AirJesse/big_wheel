// 奖品配置，包含概率和相关信息
const prizes = [
    { name: '1积分', probability: 50, image: 'images/1point.svg' },
    { name: '2积分', probability: 30, image: 'images/2point.svg' },
    { name: '5积分', probability: 15, image: 'images/5point.svg' },
    { name: '神秘玩具', probability: 5, image: 'images/mystery.svg' }
];

// 获取DOM元素
const wheel = document.getElementById('wheel');
const spinBtn = document.getElementById('spinBtn');
const stopBtn = document.getElementById('stopBtn');
const resultModal = document.getElementById('resultModal');
const resultImage = document.getElementById('resultImage');
const resultText = document.getElementById('resultText');
const closeModal = document.getElementById('closeBtn');

// 状态变量
let isSpinning = false;
let spinInterval = null;
let currentRotation = 0;
let targetRotation = 0;
let deceleration = 0;

// 根据概率选择奖品
function selectPrize() {
    const random = Math.random() * 100;
    let cumulativeProbability = 0;
    
    for (const prize of prizes) {
        cumulativeProbability += prize.probability;
        if (random < cumulativeProbability) {
            return prize;
        }
    }
    
    return prizes[0]; // 兜底返回第一个奖品
}

// 根据奖品确定最终旋转角度
function getTargetRotation(prize) {
    // 每个奖品对应的角度范围
    const angleRanges = [
        { start: 0, end: 180 },      // 1积分 (50%)
        { start: 180, end: 280.8 },  // 2积分 (30%)
        { start: 280.8, end: 318.6 }, // 5积分 (15%)
        { start: 318.6, end: 360 }   // 神秘玩具 (5%)
    ];
    
    const prizeIndex = prizes.findIndex(p => p.name === prize.name);
    const range = angleRanges[prizeIndex];
    
    // 在奖品对应的角度范围内随机选择一个角度
    const targetAngle = range.start + Math.random() * (range.end - range.start);
    
    // 添加5-10圈的旋转，让转盘转得更久
    const fullSpins = 5 + Math.floor(Math.random() * 6);
    
    return (fullSpins * 360) + (360 - targetAngle); // 减去角度是因为指针在顶部
}

// 开始转动
function startSpinning() {
    if (isSpinning) return;
    
    isSpinning = true;
    spinBtn.disabled = true;
    stopBtn.disabled = false;
    
    // 选择一个奖品
    const selectedPrize = selectPrize();
    // 设置目标旋转角度
    targetRotation = getTargetRotation(selectedPrize);
    
    // 设置初始速度和减速系数
    let speed = 0;
    const acceleration = 2; // 加速度
    const maxSpeed = 15; // 最大速度
    
    // 清除之前的动画
    wheel.style.transition = 'none';
    currentRotation = 0;
    wheel.style.transform = 'rotate(0deg)';
    
    // 强制重绘
    void wheel.offsetHeight;
    
    // 使用requestAnimationFrame实现平滑动画
    function animate() {
        if (!isSpinning) return;
        
        // 加速阶段
        if (speed < maxSpeed) {
            speed += acceleration;
        }
        
        currentRotation += speed;
        wheel.style.transform = `rotate(${currentRotation}deg)`;
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// 停止转动
function stopSpinning() {
    if (!isSpinning) return;
    
    // 确保目标角度始终大于当前角度，避免反向转动
    if (targetRotation <= currentRotation) {
        // 如果目标角度小于当前角度，添加额外的一圈
        targetRotation += 360;
    }
    
    // 设置减速动画
    wheel.style.transition = 'transform 4s cubic-bezier(0.1, 0.7, 0.1, 1)';
    wheel.style.transform = `rotate(${targetRotation}deg)`;
    
    isSpinning = false;
    stopBtn.disabled = true;
    
    // 动画结束后显示结果
    setTimeout(() => {
        showResult();
    }, 4000);
}

// 显示结果
function showResult() {
    // 根据最终角度确定实际获奖的奖品
    const finalRotation = targetRotation % 360;
    const pointerAngle = (360 - finalRotation + 360) % 360;
    let winnerIndex = 0;

    if (pointerAngle < 180) {
        winnerIndex = 0; // 1积分
    } else if (pointerAngle < 288) {
        winnerIndex = 1; // 2积分
    } else if (pointerAngle < 342) {
        winnerIndex = 2; // 5积分
    } else {
        winnerIndex = 3; // 神秘玩具
    }
    
    const winner = prizes[winnerIndex];
    
    // 更新弹窗内容
    resultImage.src = winner.image;
    resultImage.alt = winner.name;
    resultText.textContent = `恭喜你获得了${winner.name}！`;
    
    // 显示弹窗
    resultModal.style.display = 'flex';
}

// 重置转盘
function resetWheel() {
    resultModal.style.display = 'none';
    spinBtn.disabled = false;
    stopBtn.disabled = true;
    wheel.style.transition = 'none';

    // 为了让转盘下一次转动更自然，我们可以稍微调整当前角度
    // 这样指针不会总是指向同一个位置开始
    const randomOffset = Math.random() * 360;
    currentRotation = randomOffset;
    wheel.style.transform = `rotate(${randomOffset}deg)`;
}

// 事件监听
spinBtn.addEventListener('click', startSpinning);
stopBtn.addEventListener('click', stopSpinning);
closeModal.addEventListener('click', resetWheel);

// 点击弹窗外部关闭弹窗
resultModal.addEventListener('click', (e) => {
    if (e.target === resultModal) {
        resetWheel();
    }
});

// 初始化转盘位置
resetWheel();
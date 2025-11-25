const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const restartBtn = document.getElementById('restartBtn');
const backToTitleBtn = document.getElementById('backToTitleBtn');
const controlsDiv = document.getElementById('controls');
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');
const rulesBtn = document.getElementById('rulesBtn');
const backBtn = document.getElementById('backBtn');
const instructions = document.querySelector('.instructions');
const buttonGroup = document.querySelector('.button-group');

let gameStarted = false;

// キャンバスサイズを画面に合わせて調整
function resizeCanvas() {
	const maxWidth = window.innerWidth - 120; // 右側のボタンスペースを確保
	const maxHeight = window.innerHeight - 250;
	
	// 利用可能なスペースいっぱいに引き延ばす
	canvas.width = Math.floor(maxWidth);
	canvas.height = Math.floor(maxHeight);
	
	// プレイヤーの位置を画面サイズに合わせて調整
	if (player) {
		const xRatio = canvas.width / 480; // 元の幅に対する比率
		const yRatio = canvas.height / 640; // 元の高さに対する比率
		player.x = Math.min(player.x * xRatio, canvas.width - player.width);
		player.y = Math.min(player.y * yRatio, canvas.height - player.height);
	}
}

// 初期サイズ設定とリサイズイベント
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const BULLET_W = 20; //弾の幅
const BULLET_H = 16; //弾の高さ
const BULLET_SPEED = 720; //弾の速度（ピクセル/秒）

const MAX_MAGAZINES = 5; // 最大マガジン数
const MAGAZINE_SIZE = 20; // マガジンの弾数
const RELOAD_TIME = 2000; // リロード時間（ミリ秒）

let remainingMagazines = MAX_MAGAZINES; // 残りマガジン数
let magazineItems = []; // マガジンアイテムの配列

let player, bullets, enemies, score, gameOver, enemyTimer;
let lastTime = 0; // デルタタイム計算用
let playTime = 0; // プレイ時間（秒）
let highScore = localStorage.getItem('highScore') ? parseInt(localStorage.getItem('highScore')) : 0; // 最高スコア
let highTime = localStorage.getItem('highTime') ? parseFloat(localStorage.getItem('highTime')) : 0; // 最高生存時間

// タイトル画面の最高記録を更新する関数
function updateTitleStats() {
	const titleHighScore = document.getElementById('titleHighScore');
	const titleHighTime = document.getElementById('titleHighTime');
	if (titleHighScore) titleHighScore.textContent = highScore;
	if (titleHighTime) {
		const minutes = Math.floor(highTime / 60);
		const seconds = Math.floor(highTime % 60);
		titleHighTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}
}

// 初回読み込み時にタイトル画面の記録を表示
updateTitleStats();

let currentAmmo, isReloading, reloadTimer; 

let keys = {};
let shootCooldown = 0;
let touchControls = { left: false, right: false, shoot: false };

// キーボード操作
document.addEventListener('keydown', (e) => { keys[e.key] = true; });
document.addEventListener('keyup', (e) => { keys[e.key] = false; });

// タッチ操作
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const shootBtn = document.getElementById('shootBtn');
const reloadBtn = document.getElementById('reloadBtn');

if (leftBtn) {
	leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); touchControls.left = true; });
	leftBtn.addEventListener('touchend', (e) => { e.preventDefault(); touchControls.left = false; });
}

if (rightBtn) {
	rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); touchControls.right = true; });
	rightBtn.addEventListener('touchend', (e) => { e.preventDefault(); touchControls.right = false; });
}

if (shootBtn) {
	shootBtn.addEventListener('touchstart', (e) => { e.preventDefault(); touchControls.shoot = true; });
	shootBtn.addEventListener('touchend', (e) => { e.preventDefault(); touchControls.shoot = false; });
}

if (reloadBtn) {
	reloadBtn.addEventListener('touchstart', (e) => {
		e.preventDefault();
		if (!gameOver && !isReloading && currentAmmo < MAGAZINE_SIZE && remainingMagazines > 0) {
			isReloading = true;
			reloadTimer = RELOAD_TIME;
		}
	});
}

// キャンバスタッチ操作（スワイプで移動、タップで射撃）
let touchStartX = null;
canvas.addEventListener('touchstart', (e) => {
	e.preventDefault();
	if (gameOver) {
		initGame();
		return;
	}
	touchStartX = e.touches[0].clientX;
});

canvas.addEventListener('touchmove', (e) => {
	e.preventDefault();
	if (touchStartX !== null && !gameOver) {
		const touchX = e.touches[0].clientX;
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const relativeX = (touchX - rect.left) * scaleX;
		player.x = relativeX - player.width / 2;
	}
});

canvas.addEventListener('touchend', (e) => {
	e.preventDefault();
	touchStartX = null;
});

let badItems = [];
function spawnBadItem() {
    const x = Math.random() * (canvas.width - 40);
    badItems.push({ x, y: -40, width: 40, height: 40, speed: 180 }); // 速度を秒速に変更（ピクセル/秒）
}

function isOverlap(x, y, arr) {
    return arr.some(obj =>
        x < obj.x + obj.width &&
        x + 40 > obj.x &&
        y < obj.y + obj.height &&
        y + 40 > obj.y
    );
}

function initGame() {
	player = { //プレイヤーの設定
		x: canvas.width / 2 - 20, 
		y: canvas.height - 60,
		width: 40,
		height: 40,
		speed: 300 // 速度を秒速に変更（ピクセル/秒）
	};
	bullets = [];
	enemies = [];
	score = 0;
	gameOver = false;
	enemyTimer = 0;
	currentAmmo = MAGAZINE_SIZE;
	isReloading = false;
	reloadTimer = 0;
	shootCooldown = 0; // 射撃クールダウンの初期化
	lastTime = performance.now(); // デルタタイム計算の開始時刻
	remainingMagazines = MAX_MAGAZINES; // 残りマガジン数をリセット
	magazineItems = []; // マガジンアイテム配列をリセット
	playTime = 0; // プレイ時間をリセット

	restartBtn.style.display = 'none';
	backToTitleBtn.style.display = 'none';
	if (controlsDiv) controlsDiv.style.display = ''; // 操作ボタンを表示
	gameStarted = true;
	if (startScreen) startScreen.style.display = 'none'; // スタート画面を非表示
}

// スタートボタンのイベント
if (startBtn) {
	startBtn.addEventListener('click', () => {
		initGame();
		lastTime = performance.now();
		gameLoop(lastTime);
	});
}

// ゲームルールボタンのイベント
if (rulesBtn) {
	rulesBtn.addEventListener('click', () => {
		if (instructions) instructions.style.display = 'block';
		if (buttonGroup) buttonGroup.style.display = 'none';
		if (backBtn) backBtn.style.display = 'block';
	});
}

// 戻るボタンのイベント
if (backBtn) {
	backBtn.addEventListener('click', () => {
		if (instructions) instructions.style.display = 'none';
		if (buttonGroup) buttonGroup.style.display = 'flex';
		if (backBtn) backBtn.style.display = 'none';
	});
}

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if(gameOver && (e.key === ' ' || e.key === 'Spacebar')) {
        initGame();
		keys[' '] = false; // スペースキーの状態をリセット
		return; 
    }
	if (gameOver) {
		if (e.key === ' ' || e.key === 'Spacebar') {
			initGame();
			keys[' '] = false; // スペースキーの状態をリセット
			return; 
		}
		return;
	}
	// 手動リロード（Rキー）
	if(!gameOver && (e.key === 'r' || e.key === 'R')) {
	    if(!isReloading && currentAmmo < MAGAZINE_SIZE && remainingMagazines > 0) {
	        isReloading = true;
	        reloadTimer = RELOAD_TIME;
	    }
	}
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

restartBtn.addEventListener('click', () => {
	initGame();
});

backToTitleBtn.addEventListener('click', () => {
	startScreen.style.display = 'flex';
	controlsDiv.style.display = 'none';
	restartBtn.style.display = 'none';
	backToTitleBtn.style.display = 'none';
	gameStarted = false;
	updateTitleStats(); // タイトル画面の記録を更新
});

function spawnMagazineItem(x, y) {
	magazineItems.push({ x, y, width: 30, height: 30, speed: 120 }); // ピクセル/秒
}

function spawnEnemy() {
	let x,y = -40,tries = 0;
    do {
        x = Math.random() * (canvas.width - 40);
        tries++;
    } while (isOverlap(x, y, enemies) && tries < 10);
	enemies.push({ x, y: -40, width: 40, height: 40, speed: 240 }); // 速度を秒速に変更（ピクセル/秒）
}

function spawnBadItem() {
    let x,y = -40,tries = 0;
    do {
        x = Math.random() * (canvas.width - 40);
        tries++;
    } while (isOverlap(x, y, badItems) && tries < 10);
    badItems.push({ x, y: -40, width: 40, height: 40, speed: 180 }); // 速度を秒速に変更（ピクセル/秒）
}

function update(deltaTime) {
	// プレイ時間を更新
	if (!gameOver) {
		playTime += deltaTime;
	}
	
    //badItemsの移動（デルタタイム適用）
    badItems.forEach(item => item.y += item.speed * deltaTime);
    badItems = badItems.filter(item => item.y < canvas.height);

	// マガジンアイテムの移動（デルタタイム適用）
	magazineItems.forEach(item => item.y += item.speed * deltaTime);
	magazineItems = magazineItems.filter(item => item.y < canvas.height);

	// リロード処理（ミリ秒単位）
	if (isReloading) {
		reloadTimer -= deltaTime * 1000; // デルタタイムをミリ秒に変換
		if (reloadTimer <= 0) {
			isReloading = false;
			if (remainingMagazines > 0) {
				remainingMagazines--;
				currentAmmo = MAGAZINE_SIZE;
			} else {
				currentAmmo = 0; // マガジンがない場合は弾を補充しない
			}
		}
	}

	// プレイヤーとマガジンアイテムの当たり判定
	magazineItems.forEach((item, iIdx) => {
		if (
			player.x < item.x + item.width &&
			player.x + player.width > item.x &&
			player.y < item.y + item.height &&
			player.y + player.height > item.y
		) {
			magazineItems.splice(iIdx, 1);
			if (remainingMagazines < MAX_MAGAZINES) {
				remainingMagazines++; // マガジン数を1つ増やす
			}
		}
	});

	//弾とbaditemの当たり判定
	bullets.forEach((bullet, bIdx) => {
		badItems.forEach((item, iIdx) => {
			if (
				bullet.x < item.x + item.width &&
				bullet.x + bullet.width > item.x &&
				bullet.y < item.y + item.height &&
				bullet.y + bullet.height > item.y
			) {
				bullets.splice(bIdx, 1);
				badItems.splice(iIdx, 1);
				score -= 20; // スコア減少
			}
		});
	});
	if (gameOver) return;
	
	// キーボードまたはタッチで左右移動
    if(keys['ArrowLeft'] || touchControls.left) player.x -= player.speed * deltaTime;
    if(keys['ArrowRight'] || touchControls.right) player.x += player.speed * deltaTime;
    
	// キーボードまたはタッチで射撃
	if(keys[' '] || touchControls.shoot) {
		if(shootCooldown <= 0 && !isReloading) {
			if (currentAmmo > 0) {
				bullets.push({
				 x: player.x + player.width / 2 - BULLET_W / 2,
				 y: player.y,
				width: BULLET_W,
				height: BULLET_H,
				 speed: BULLET_SPEED
							});
				currentAmmo--;
				shootCooldown = 250; // クールダウン時間（ミリ秒）
				// 自動リロードは行わない（手動でRキーを押してください）
			} else {
				// 弾がない場合は射撃不可。連打抑止のため軽いクールダウンを入れる
				shootCooldown = 333;
			}
		}
	}
       if(shootCooldown > 0) shootCooldown -= deltaTime * 1000; // ミリ秒単位で減算

	// プレイヤーの範囲制限
	player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

	// 弾の移動（デルタタイム適用）
	bullets.forEach(bullet => bullet.y -= bullet.speed * deltaTime);
	bullets = bullets.filter(bullet => bullet.y + bullet.height > 0);

	// 敵の移動（デルタタイム適用）
	enemies.forEach(enemy => enemy.y += enemy.speed * deltaTime);
	enemies = enemies.filter(enemy => enemy.y < canvas.height);

	// 弾と敵の当たり判定
	bullets.forEach((bullet, bIdx) => {
		enemies.forEach((enemy, eIdx) => {
			if (
				bullet.x < enemy.x + enemy.width &&
				bullet.x + bullet.width > enemy.x &&
				bullet.y < enemy.y + enemy.height &&
				bullet.y + bullet.height > enemy.y
			) {
				const enemyX = enemy.x;
				const enemyY = enemy.y;
				bullets.splice(bIdx, 1);
				enemies.splice(eIdx, 1);
				score += 10;

				// 一定確率でマガジンアイテムをドロップ
				if (Math.random() < 0.1) { // 10%の確率
					spawnMagazineItem(enemyX, enemyY);
				}
			}
		});
	});

	// 敵とプレイヤーの当たり判定
	enemies.forEach(enemy => {
		if (
			player.x < enemy.x + enemy.width &&
			player.x + player.width > enemy.x &&
			player.y < enemy.y + enemy.height &&
			player.y + player.height > enemy.y
		) {
			gameOver = true;
			// 最高スコア更新
			if (score > highScore) {
				highScore = score;
				localStorage.setItem('highScore', highScore);
			}
			// 最高生存時間更新
			if (playTime > highTime) {
				highTime = playTime;
				localStorage.setItem('highTime', highTime);
			}
			restartBtn.style.display = 'inline-block';
			backToTitleBtn.style.display = 'inline-block';
			if (controlsDiv) controlsDiv.style.display = 'none'; // 操作ボタンを非表示
		}
	});
}

function draw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

    //badItemsの描画
    ctx.fillStyle = '#ff0';
    badItems.forEach(item => {
        ctx.fillRect(item.x, item.y, item.width, item.height);
    }); 

	// プレイヤー
	//マガジンが０の場合は赤それ以外はシアン
	ctx.fillStyle = remainingMagazines === 0 ? '#f00' : '#0ff';
	ctx.fillRect(player.x, player.y, player.width, player.height);

	//リロード中はオレンジの枠線を追加
	if (isReloading) {
		ctx.strokeStyle = '#ffa500'; // オレンジ色
		ctx.lineWidth = 3;
		ctx.strokeRect(player.x, player.y, player.width, player.height);
	}

	// 弾がない場合は赤い枠線を追加
	else if (currentAmmo === 0) {
		ctx.strokeStyle = '#f00'; // 赤色
		ctx.lineWidth = 3;
		ctx.strokeRect(player.x, player.y, player.width, player.height);
	}

	// 弾
	ctx.fillStyle = '#fff';
	bullets.forEach(bullet => {
		ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
	});

	// 敵
	ctx.fillStyle = '#f00';
	enemies.forEach(enemy => {
		ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
	});

	// スコア表示
	const minutes = Math.floor(playTime / 60);
	const seconds = Math.floor(playTime % 60);
	const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
	
	const highMinutes = Math.floor(highTime / 60);
	const highSeconds = Math.floor(highTime % 60);
	const highTimeText = `${highMinutes}:${highSeconds.toString().padStart(2, '0')}`;
	
	const scoreDiv = document.getElementById('score');
	scoreDiv.innerHTML = `
		<div>スコア: ${score} | 最高スコア: ${highScore}</div>
		<div>時間: ${timeText} | 最高時間: ${highTimeText}</div>
	`;

	// 残弾表示（キャンバス上）
	ctx.fillStyle = '#fff';
	ctx.font = '20px sans-serif';
	const ammoText = isReloading ? 'リロード中...' : `弾: ${currentAmmo} / ${MAGAZINE_SIZE} 残りマガジン: ${remainingMagazines}`;
	ctx.fillText(ammoText, 10, 30);

	// 弾薬警告表示
	if (!gameOver && !isReloading) {
		ctx.textAlign = 'center';
		if (currentAmmo <= 3 && currentAmmo > 0) {
			ctx.fillStyle = '#ff0';
			ctx.font = 'bold 24px sans-serif';
			ctx.fillText('⚠ 弾薬残り少ない！', canvas.width / 2, 60);
		} else if (currentAmmo === 0 && remainingMagazines > 0) {
			ctx.fillStyle = '#f00';
			ctx.font = 'bold 28px sans-serif';
			ctx.fillText('⚠ リロードしてください！', canvas.width / 2, 60);
		} else if (remainingMagazines === 0 && currentAmmo <= 5) {
			ctx.fillStyle = '#f00';
			ctx.font = 'bold 24px sans-serif';
			ctx.fillText('⚠ マガジン切れ！', canvas.width / 2, 60);
		}
		ctx.textAlign = 'left';
	}

	// ゲームオーバー
	if (gameOver) {
		ctx.fillStyle = '#fff';
		ctx.font = '48px sans-serif';
		ctx.fillText('GAME OVER', canvas.width / 2 - 140, canvas.height / 2);
	}

	// マガジンアイテムの描画
	ctx.fillStyle = '#0f0';// 緑色
	magazineItems.forEach(item => {
		ctx.fillRect(item.x, item.y, item.width, item.height);
	});
}

function gameLoop(currentTime) {
	// デルタタイム計算（秒単位）
	const deltaTime = (currentTime - lastTime) / 1000;
	lastTime = currentTime;

	// デルタタイムが異常値の場合はスキップ（初回やタブ切替後など）
	if (deltaTime > 0.1) {
		requestAnimationFrame(gameLoop);
		return;
	}

	update(deltaTime);
	draw();
	if (!gameOver) {
		enemyTimer += deltaTime * 1000; // ミリ秒単位で加算
		if (enemyTimer >= 1000) { // 1秒ごと
			spawnEnemy();
			enemyTimer -= 1000;
		}
        if (enemyTimer % 2000 < deltaTime * 1000) spawnBadItem(); // 約2秒ごと
	}
	requestAnimationFrame(gameLoop);
}

// ゲームループは初期化しない（スタートボタンで開始）

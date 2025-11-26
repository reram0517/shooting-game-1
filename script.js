const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const restartBtn = document.getElementById('restartBtn');
const backToTitleBtn = document.getElementById('backToTitleBtn');
const controlsDiv = document.getElementById('controls');
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');
const playBtn = document.getElementById('playBtn');
const rulesBtn = document.getElementById('rulesBtn');
const backBtn = document.getElementById('backBtn');
const instructions = document.querySelector('.instructions');
const mainMenu = document.getElementById('mainMenu');
const difficultySelect = document.getElementById('difficultySelect');
const backToMenuBtn = document.getElementById('backToMenuBtn');
const difficultyBtns = document.querySelectorAll('.difficultyBtn');

console.log('Script loaded');
console.log('startBtn:', startBtn);
console.log('playBtn:', playBtn);
console.log('rulesBtn:', rulesBtn);
console.log('backBtn:', backBtn);

let gameStarted = false;
let currentDifficulty = 'normal'; // デフォルトは普通

// 難易度設定
const difficultySettings = {
	easy: {
		enemySpeed: 180,
		enemySpawnInterval: 1000,
		badItemSpeed: 140,
		badItemSpawnInterval: 2000
	},
	normal: {
		enemySpeed: 240,
		enemySpawnInterval: 1000,
		badItemSpeed: 180,
		badItemSpawnInterval: 2000
	},
	hard: {
		enemySpeed: 320,
		enemySpawnInterval: 700,
		badItemSpeed: 240,
		badItemSpawnInterval: 1500
	}
};

// キャンバスサイズを画面に合わせて調整
function resizeCanvas() {
	const oldWidth = canvas.width;
	const oldHeight = canvas.height;
	
	// 左側に10pxの余白、右側にボタンスペースを確保
	const leftMargin = 10;
	const rightButtonSpace = 105;
	const maxWidth = window.innerWidth - leftMargin - rightButtonSpace;
	
	// 下部のスペースを動的に計算
	// コントロール部分の高さ(約130px) + ボタン2つ分の高さ(約120px) + マージン(約50px)
	const controlsHeight = 130;
	const buttonsHeight = 120;
	const extraMargin = 50;
	const bottomSpace = controlsHeight + buttonsHeight + extraMargin;
	
	// 画面の高さに応じて調整（小さい画面では最低限のスペースを確保）
	const minBottomSpace = 250;
	const maxHeight = window.innerHeight - Math.max(bottomSpace, minBottomSpace);
	
	// 利用可能なスペースいっぱいに引き延ばす
	canvas.width = Math.floor(Math.max(maxWidth, 200)); // 最小幅200pxを確保
	canvas.height = Math.floor(Math.max(maxHeight, 200)); // 最小高さ200pxを確保
	
	// プレイヤーの位置を画面サイズに合わせて調整（ゲーム開始後のみ）
	if (player && gameStarted && oldWidth > 0 && oldHeight > 0) {
		const xRatio = canvas.width / oldWidth;
		const yRatio = canvas.height / oldHeight;
		player.x = Math.min(player.x * xRatio, canvas.width - player.width);
		player.y = Math.min(player.y * yRatio, canvas.height - player.height);
	}
	
	// 右側のコントロールボタンの位置を更新
	updateControlsPosition();
}

// 右側のボタン位置をキャンバスの下端に合わせる
function updateControlsPosition() {
	const rightControls = document.querySelector('#controls .control-group:last-child');
	if (rightControls) {
		const canvasRect = canvas.getBoundingClientRect();
		const bottomOffset = window.innerHeight - (canvasRect.top + canvasRect.height) + 10;
		rightControls.style.bottom = bottomOffset + 'px';
	}
}

// 初期サイズ設定とリサイズイベント
// resizeCanvas(); // 初回実行を削除（playerがnullのため）
const initialBottomSpace = Math.max(300, 130 + 120 + 50);
const initialLeftMargin = 10; // 左側の余白
const initialRightSpace = 105; // 右側のボタンスペース
canvas.width = Math.floor(Math.max(window.innerWidth - initialLeftMargin - initialRightSpace, 200));
canvas.height = Math.floor(Math.max(window.innerHeight - initialBottomSpace, 200));
updateControlsPosition(); // ボタン位置を初期設定
window.addEventListener('resize', resizeCanvas);

const BULLET_W = 20; //弾の幅
const BULLET_H = 16; //弾の高さ
const BULLET_SPEED = 720; //弾の速度（ピクセル/秒）

const MAX_MAGAZINES = 5; // 最大マガジン数
const MAGAZINE_SIZE = 20; // マガジンの弾数
const RELOAD_TIME = 2000; // リロード時間（ミリ秒）
const INVINCIBLE_TIME = 5; // 無敵時間（秒）

let remainingMagazines = MAX_MAGAZINES; // 残りマガジン数
let magazineItems = []; // マガジンアイテムの配列
let specialItems = []; // 特殊アイテムの配列
let isInvincible = false; // 無敵状態かどうか
let invincibleTimer = 0; // 無敵時間の残り

let player = null, bullets, soldiers, score, gameOver, soldierTimer; // 一般兵
let specialItemTimer = 0; // 特殊アイテム用タイマー
let lastSpecialItemScore = 0; // 最後に特殊アイテムが出た時のスコア
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
		lastTime = performance.now();
		requestAnimationFrame(gameLoop);
		return;
	}
	if (player) {
		touchStartX = e.touches[0].clientX;
	}
});

canvas.addEventListener('touchmove', (e) => {
	e.preventDefault();
	if (touchStartX !== null && !gameOver && player) {
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

let bomberSoldiers = []; // 爆弾兵
function spawnBomberSoldier() { // 爆弾兵をスポーン
    const x = Math.random() * (canvas.width - 40);
    const settings = difficultySettings[currentDifficulty];
    bomberSoldiers.push({ x, y: -40, width: 40, height: 40, speed: settings.badItemSpeed });
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
	soldiers = []; // 一般兵の配列
	bomberSoldiers = []; // 爆弾兵の配列
	score = 0;
	gameOver = false;
	soldierTimer = 0; // 一般兵のスポーンタイマー
	specialItemTimer = 0; // 特殊アイテムタイマーをリセット
	lastSpecialItemScore = 0; // 最後に特殊アイテムが出た時のスコアをリセット
	currentAmmo = MAGAZINE_SIZE;
	isReloading = false;
	reloadTimer = 0;
	shootCooldown = 0; // 射撃クールダウンの初期化
	lastTime = performance.now(); // デルタタイム計算の開始時刻
	remainingMagazines = MAX_MAGAZINES; // 残りマガジン数をリセット
	magazineItems = []; // マガジンアイテム配列をリセット
	specialItems = []; // 特殊アイテム配列をリセット
	isInvincible = false; // 無敵状態をリセット
	invincibleTimer = 0; // 無敵タイマーをリセット
	playTime = 0; // プレイ時間をリセット

	restartBtn.style.display = 'none';
	backToTitleBtn.style.display = 'none';
	if (controlsDiv) controlsDiv.style.display = ''; // 操作ボタンを表示
	gameStarted = true;
	if (startScreen) startScreen.style.display = 'none'; // スタート画面を非表示
}

// スタートボタン（ゲーム選択）のイベント
let startBtnClicked = false;

function handleShowDifficultySelect(e) {
	if (startBtnClicked) return;
	startBtnClicked = true;
	
	if (e) {
		e.preventDefault();
		e.stopPropagation();
	}
	
	if (mainMenu) mainMenu.style.display = 'none';
	if (difficultySelect) difficultySelect.style.display = 'block';
	
	setTimeout(() => { startBtnClicked = false; }, 500);
}

if (startBtn) {
	console.log('startBtn found:', startBtn);
	startBtn.addEventListener('click', handleShowDifficultySelect);
	startBtn.addEventListener('touchend', handleShowDifficultySelect);
} else {
	console.error('startBtn not found!');
}

// プレイボタン（ゲーム開始）のイベント
let playBtnClicked = false;

function handleStartGame(e) {
	if (playBtnClicked) {
		console.log('Already clicked, returning');
		return;
	}
	playBtnClicked = true;
	
	if (e) {
		e.preventDefault();
		e.stopPropagation();
	}
	
	console.log('Initializing game...');
	initGame();
	lastTime = performance.now();
	console.log('Starting game loop...');
	requestAnimationFrame(gameLoop);
	
	setTimeout(() => { playBtnClicked = false; }, 500);
}

if (playBtn) {
	console.log('playBtn found:', playBtn);
	playBtn.addEventListener('click', handleStartGame);
	playBtn.addEventListener('touchend', handleStartGame);
} else {
	console.error('playBtn not found!');
}

// 難易度選択ボタンのイベント
difficultyBtns.forEach(btn => {
	btn.addEventListener('click', (e) => {
		e.preventDefault();
		const difficulty = btn.getAttribute('data-difficulty');
		currentDifficulty = difficulty;
		
		// すべてのボタンの枠線を外す
		difficultyBtns.forEach(b => b.style.border = 'none');
		// 選択されたボタンに枠線を追加
		btn.style.border = '3px solid #fff';
	});
});

// ゲームルールボタンのイベント
let rulesBtnClicked = false;

function handleShowRules(e) {
	if (rulesBtnClicked) return;
	rulesBtnClicked = true;
	
	if (e) {
		e.preventDefault();
		e.stopPropagation();
	}
	
	if (instructions) instructions.style.display = 'block';
	if (mainMenu) mainMenu.style.display = 'none';
	if (backBtn) backBtn.style.display = 'block';
	if (difficultySelect) difficultySelect.style.display = 'none';
	
	setTimeout(() => { rulesBtnClicked = false; }, 500);
}

if (rulesBtn) {
	rulesBtn.addEventListener('click', handleShowRules);
	rulesBtn.addEventListener('touchend', handleShowRules);
}

// 戻るボタンのイベント
let backBtnClicked = false;

function handleBackToTitle(e) {
	if (backBtnClicked) return;
	backBtnClicked = true;
	
	if (e) {
		e.preventDefault();
		e.stopPropagation();
	}
	
	if (instructions) instructions.style.display = 'none';
	if (mainMenu) mainMenu.style.display = 'block';
	if (backBtn) backBtn.style.display = 'none';
	if (difficultySelect) difficultySelect.style.display = 'none';
	
	setTimeout(() => { backBtnClicked = false; }, 500);
}

if (backBtn) {
	backBtn.addEventListener('click', handleBackToTitle);
	backBtn.addEventListener('touchend', handleBackToTitle);
}

// 難易度選択画面からメインメニューに戻るボタンのイベント
if (backToMenuBtn) {
	backToMenuBtn.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (difficultySelect) difficultySelect.style.display = 'none';
		if (mainMenu) mainMenu.style.display = 'block';
	});
	backToMenuBtn.addEventListener('touchend', (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (difficultySelect) difficultySelect.style.display = 'none';
		if (mainMenu) mainMenu.style.display = 'block';
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
	lastTime = performance.now();
	requestAnimationFrame(gameLoop);
});

backToTitleBtn.addEventListener('click', () => {
	startScreen.style.display = 'flex';
	controlsDiv.style.display = 'none';
	restartBtn.style.display = 'none';
	backToTitleBtn.style.display = 'none';
	gameStarted = false;
	// メインメニューに戻る
	if (mainMenu) mainMenu.style.display = 'block';
	if (difficultySelect) difficultySelect.style.display = 'none';
	updateTitleStats(); // タイトル画面の記録を更新
});

function spawnMagazineItem(x, y) {
	magazineItems.push({ x, y, width: 30, height: 30, speed: 120 }); // ピクセル/秒
}

function spawnSpecialItem() {
	let x, y = -40, tries = 0;
	do {
		x = Math.random() * (canvas.width - 40);
		tries++;
	} while (isOverlap(x, y, specialItems) && tries < 10);
	specialItems.push({ x, y, width: 35, height: 35, speed: 150 }); // ピクセル/秒
}

function spawnSoldier() { // 一般兵をスポーン
	let x,y = -40,tries = 0;
    do {
        x = Math.random() * (canvas.width - 40);
        tries++;
    } while (isOverlap(x, y, soldiers) && tries < 10);
	const settings = difficultySettings[currentDifficulty];
	soldiers.push({ x, y: -40, width: 40, height: 40, speed: settings.enemySpeed });
}

function update(deltaTime) {
	// プレイ時間を更新
	if (!gameOver) {
		playTime += deltaTime;
	}
	
    // 爆弾兵の移動（デルタタイム適用）
    bomberSoldiers.forEach(bomber => bomber.y += bomber.speed * deltaTime);
    bomberSoldiers = bomberSoldiers.filter(bomber => bomber.y < canvas.height);

	// マガジンアイテムの移動（デルタタイム適用）
	magazineItems.forEach(item => item.y += item.speed * deltaTime);
	magazineItems = magazineItems.filter(item => item.y < canvas.height);

	// 特殊アイテムの移動（デルタタイム適用）
	specialItems.forEach(item => item.y += item.speed * deltaTime);
	specialItems = specialItems.filter(item => item.y < canvas.height);

	// 無敵タイマーの更新
	if (isInvincible) {
		invincibleTimer -= deltaTime;
		if (invincibleTimer <= 0) {
			isInvincible = false;
			invincibleTimer = 0;
		}
	}

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

	// プレイヤーと特殊アイテムの当たり判定
	specialItems.forEach((item, iIdx) => {
		if (
			player.x < item.x + item.width &&
			player.x + player.width > item.x &&
			player.y < item.y + item.height &&
			player.y + player.height > item.y
		) {
			specialItems.splice(iIdx, 1);
			isInvincible = true; // 無敵状態にする
			invincibleTimer = INVINCIBLE_TIME; // 10秒間
		}
	});

	//弾とbaditemの当たり判定
	bullets.forEach((bullet, bIdx) => {
		bomberSoldiers.forEach((bomber, bIdx2) => { // 爆弾兵
			if (
				bullet.x < bomber.x + bomber.width &&
				bullet.x + bullet.width > bomber.x &&
				bullet.y < bomber.y + bomber.height &&
				bullet.y + bullet.height > bomber.y
			) {
				bullets.splice(bIdx, 1);
				bomberSoldiers.splice(bIdx2, 1);
				if (isInvincible) { // 無敵状態ならスコア増加
					score += 10;
				} else { // 無敵状態でなければスコア減少
					score -= 20;
				}
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
			if (currentAmmo > 0 || isInvincible) { // 無敵中は弾無限
				bullets.push({
				 x: player.x + player.width / 2 - BULLET_W / 2,
				 y: player.y,
				width: BULLET_W,
				height: BULLET_H,
				 speed: BULLET_SPEED
							});
				if (!isInvincible) { // 無敵中でなければ弾を消費
					currentAmmo--;
				}
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

	// 一般兵の移動（デルタタイム適用）
	soldiers.forEach(soldier => soldier.y += soldier.speed * deltaTime);
	soldiers = soldiers.filter(soldier => soldier.y < canvas.height);

	// 弾と一般兵の当たり判定
	bullets.forEach((bullet, bIdx) => {
		soldiers.forEach((soldier, sIdx) => {
			if (
				bullet.x < soldier.x + soldier.width &&
				bullet.x + bullet.width > soldier.x &&
				bullet.y < soldier.y + soldier.height &&
				bullet.y + bullet.height > soldier.y
			) {
				const soldierX = soldier.x;
				const soldierY = soldier.y;
				bullets.splice(bIdx, 1);
				soldiers.splice(sIdx, 1);
				score += 10;

				// 一定確率でマガジンアイテムをドロップ（最大数未満の場合のみ）
				if (remainingMagazines < MAX_MAGAZINES && Math.random() < 0.1) { // 10%の確率
					spawnMagazineItem(soldierX, soldierY);
				}
			}
		});
	});

	// 一般兵とプレイヤーの当たり判定
	soldiers.forEach(soldier => {
		if (
			player.x < soldier.x + soldier.width &&
			player.x + player.width > soldier.x &&
			player.y < soldier.y + soldier.height &&
			player.y + player.height > soldier.y
		) {
			if (!isInvincible) { // 無敵状態でなければゲームオーバー
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
		}
	});

	// 爆弾兵とプレイヤーの当たり判定
	bomberSoldiers.forEach(bomber => {
		if (
			player.x < bomber.x + bomber.width &&
			player.x + player.width > bomber.x &&
			player.y < bomber.y + bomber.height &&
			player.y + player.height > bomber.y
		) {
			if (!isInvincible && currentDifficulty !== 'easy') { // 無敵状態でなく、イージーモードでなければゲームオーバー
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
		}
	});
}

function draw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 爆弾兵の描画
    ctx.fillStyle = '#ff0'; // 黄色
    bomberSoldiers.forEach(bomber => {
        ctx.fillRect(bomber.x, bomber.y, bomber.width, bomber.height);
        // 爆弾兵の四角の中に「爆」と表示
        ctx.fillStyle = '#f00'; // 赤文字
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('爆', bomber.x + bomber.width / 2, bomber.y + bomber.height / 2);
        ctx.fillStyle = '#ff0'; // 色を戻す
    }); 

	// プレイヤー
	//マガジンが０の場合は赤、無敵状態ならゴールド、それ以外はシアン
	if (isInvincible) {
		ctx.fillStyle = '#ffd700'; // ゴールド（無敵状態）
	} else {
		ctx.fillStyle = remainingMagazines === 0 ? '#f00' : '#0ff';
	}
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
	
	// 無敵状態の枠線
	else if (isInvincible) {
		ctx.strokeStyle = '#ffd700'; // ゴールド
		ctx.lineWidth = 4;
		ctx.strokeRect(player.x, player.y, player.width, player.height);
	}

	// 弾
	ctx.fillStyle = '#fff';
	bullets.forEach(bullet => {
		ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
	});

	// 一般兵（赤い敵）
	ctx.fillStyle = '#f00';
	soldiers.forEach(soldier => {
		ctx.fillRect(soldier.x, soldier.y, soldier.width, soldier.height);
		// 一般兵の四角の中に「兵」と表示
		ctx.fillStyle = '#fff';
		ctx.font = 'bold 24px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('兵', soldier.x + soldier.width / 2, soldier.y + soldier.height / 2);
		ctx.fillStyle = '#f00'; // 色を戻す
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
		<div class="current-score">スコア: ${score}</div>
		<div>時間: ${timeText} | 最高: ${highScore} / ${highTimeText}</div>
	`;

	// 残弾表示（キャンバス上）
	ctx.fillStyle = '#fff';
	ctx.font = `${Math.max(14, Math.min(20, canvas.width / 24))}px sans-serif`; // 画面サイズに応じたフォント
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	const ammoText = isReloading ? 'リロード中...' : `弾: ${currentAmmo} / ${MAGAZINE_SIZE} 残りマガジン: ${remainingMagazines}`;
	ctx.fillText(ammoText, 10, 10);

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
		ctx.font = `bold ${Math.min(48, canvas.width / 10)}px sans-serif`; // 画面サイズに応じたフォント
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
		ctx.textAlign = 'left'; // テキスト配置を戻す
		ctx.textBaseline = 'alphabetic'; // ベースラインを戻す
	}

	// マガジンアイテムの描画
	ctx.fillStyle = '#0f0';// 緑色
	magazineItems.forEach(item => {
		ctx.fillRect(item.x, item.y, item.width, item.height);
	});

	// 特殊アイテムの描画（紫色の星マーク）
	ctx.fillStyle = '#d800ff'; // 紫色
	specialItems.forEach(item => {
		// 星のような形を描画
		ctx.beginPath();
		ctx.arc(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = '#fff';
		ctx.lineWidth = 2;
		ctx.stroke();
	});

	// 無敵タイマーの表示
	if (isInvincible) {
		ctx.fillStyle = '#ffd700';
		ctx.font = 'bold 28px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(`⭐ 無敵: ${Math.ceil(invincibleTimer)}秒`, canvas.width / 2, 40);
		ctx.textAlign = 'left';
	}
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
		soldierTimer += deltaTime * 1000; // ミリ秒単位で加算
		const settings = difficultySettings[currentDifficulty];
		
		// スコアが100上がるごとに特殊アイテムをスポーン
		if (score - lastSpecialItemScore >= 500) {
			spawnSpecialItem();
			lastSpecialItemScore = score;
		}
		
		if (soldierTimer >= settings.enemySpawnInterval) { // 難易度に応じた間隔で一般兵をスポーン
			spawnSoldier();
			soldierTimer -= settings.enemySpawnInterval;
		}
        if (soldierTimer % settings.badItemSpawnInterval < deltaTime * 1000) spawnBomberSoldier(); // 難易度に応じた間隔で爆弾兵をスポーン
	}
	requestAnimationFrame(gameLoop);
}

// ゲームループは初期化しない（スタートボタンで開始）

import { map, MAP_WIDTH, MAP_HEIGHT, changeRandomMap } from './map.js';

const playerImage = new Image();
playerImage.src = "./images/club.png";
const enemy_eImage = new Image();
enemy_eImage.src = "./images/fish.png";
const enemy_sImage = new Image();
enemy_sImage.src = "./images/gun_ebi.png";
const itemImage = new Image();
itemImage.src = "./images/takara.png";


 // 図鑑の要素を取得
const encyclopediaButton = document.getElementById("encyclopediaButton");
const encyclopediaPanel = document.getElementById("encyclopediaPanel");
const closeEncyclopedia = document.getElementById("closeEncyclopedia");

const monsterTab = document.getElementById("monsterTab");
const itemTab = document.getElementById("itemTab");
const encyclopediaContent = document.getElementById("encyclopediaContent");

// 図鑑を開く
encyclopediaButton.addEventListener("click", () => {
    encyclopediaPanel.style.display = "block";
});

// 図鑑を閉じる
closeEncyclopedia.addEventListener("click", () => {
    encyclopediaPanel.style.display = "none";
});

// カメラに表示するマスの数
const VIEW_WIDTH = 5;
const VIEW_HEIGHT = 5;


const itemData = [
    {
        name: "回復薬",
        effect: "HPを4割回復する"
    },
    {
        name: "貝",
        effect: "満腹度を100回復する"
    }
];

const monsterData = [
    {
        name: "青い魚",
        hp: 5,
        attack: 2,
        description: "上下左右を攻撃"
    },
    {
        name: "武装エビ",
        hp: 8,
        attack: 3,
        description: "上下左右２マスを攻撃"
    }
];

// --- ゲームの状態 ---
const player = {
    x: -1, y: -1,
    hp: 10, maxHp: 10,
    hunger: 100, maxHunger: 100,
    level: 1,
    exp: 0,
    atk: 1,
    nextExp: 5,
    inventory: []
};

const stairs = { x: -1, y: -1 };

const enemies = [];
const items = [];
let floor = 1;
const maxFloor = 20;


// モンスター図鑑を表示
monsterTab.addEventListener("click", () => {
    encyclopediaContent.innerHTML = `
        <h3>モンスター図鑑</h3>
        <div class="monster-list">
            ${monsterData.map(monster => `
                <div class="monster-card">
                    <h4>${monster.name}</h4>
                    <p>効果：${monster.description}</p>
                </div>
            `).join("")}
        </div>
    `;
});

// アイテム図鑑を表示

itemTab.addEventListener("click", () => {
    encyclopediaContent.innerHTML = `
        <h3>アイテム図鑑</h3>
        <div class="monster-list">
            ${itemData.map(item => `
                <div class="monster-card">
                    <h4>${item.name}</h4>
                    <p>効果：${item.effect}</p>
                </div>
            `).join("")}
        </div>
    `;
});


// インベントリの何番目かを指定して使う関数
function useItem(index) {
    if (index < 0 || index >= player.inventory.length) {
        return;
    }

    let item = player.inventory[index];

    if (item.type === "potion") {
        player.hp = Math.min(player.hp + Math.ceil(player.maxHp * 0.4),player.maxHp);
        addMessage(`${item.name}を使った！ HPが回復した！`);
    } else if (item.type === "food") {
        player.hunger = Math.min(player.maxHunger, player.hunger + item.restore);
        addMessage(`${item.name}を食べた！ お腹が満たされた！`);
    }

    // インベントリから削除
    player.inventory.splice(index, 1);
    
    // アイテムを使ったら1ターン経過させる
    drawGame();
}
// 指定した座標をチェックする関数
function isCellEmpty(x, y) {
    if (map[y][x] === 1) return false; // 壁ならNG
    if (player.x === x && player.y === y) return false;
    if (stairs.x === x && stairs.y === y) return false;
    // ほかの敵
    for (let e of enemies) {
        if (e.hp > 0 && e.x === x && e.y === y) return false;
    }
    // ほかのアイテム
    for (let i of items) {
        if (i.x === x && i.y === y) return false;
    }

    return true; // どこも被ってない
}

// ランダムな空きマスを探す関数
function getRandomEmptyPosition() {
    const emptyCells = [];

    for (let y = 1; y < map.length - 1; y++) {
        for (let x = 1; x < map[y].length - 1; x++) {
            if (isCellEmpty(x, y)) {
                emptyCells.push({ x, y });
            }
        }
    }

    if (emptyCells.length === 0) {
        throw new Error("床が配置できません");
    }

    const index = Math.floor(Math.random() * emptyCells.length);
    return emptyCells[index];
}

// プレイヤーを配置
Object.assign(player, getRandomEmptyPosition());

// 階段を配置
Object.assign(stairs, getRandomEmptyPosition());

// 敵を2体配置

for (let i = 0; i < 2; i++) {
    const pos = getRandomEmptyPosition();
    let isRanged = Math.random() < 0.5;

    // 敵のレベルを設定
    let enemyLevel = floor;

    enemies.push({
        x: pos.x,
        y: pos.y,
        level: enemyLevel,
        hp: 3 + (enemyLevel - 1) * 2,
        attack: Math.max(1, Math.floor(enemyLevel / 2)),
        exp: enemyLevel + 1,
        type: isRanged ? "ranged" : "melee",
        symbol: isRanged ? "S" : "E"
    });
}


// 配置
let iPos = getRandomEmptyPosition();
let itemType = Math.random() < 0.5 ? "potion" : "food";
let itemName = itemType === "potion" ? "回復薬" : "貝";
items.push({ 
    x: iPos.x, 
    y: iPos.y, 
    type: itemType, 
    name: itemName,
    restore: 100    // 満腹度回復量
});
// メッセージログ関数
function addMessage(text) {
    const logBox = document.getElementById("log-box");
    logBox.innerHTML += `<br>${text}`;
    logBox.scrollTop = logBox.scrollHeight;
}


function drawGame() {
    const board = document.getElementById("board");
    board.innerHTML = "";

    // カメラの左上の座標を計算
    let startX = player.x - Math.floor(VIEW_WIDTH / 2);
    let startY = player.y - Math.floor(VIEW_HEIGHT / 2);

    startX = Math.max(0, Math.min(startX, map[0].length - VIEW_WIDTH));
    startY = Math.max(0, Math.min(startY, map.length - VIEW_HEIGHT));

    // 画面に表示する9×9マスを描画
    for (let y = 0; y < VIEW_HEIGHT; y++) {
        for (let x = 0; x < VIEW_WIDTH; x++) {
            // 画面内の座標からマップ全体の座標を求める
            const mapX = startX + x;
            const mapY = startY + y;

            const cell = document.createElement("div");
            cell.className = "cell";

            if (map[mapY][mapX] === 1) {
                cell.style.backgroundColor ="#575658";
            } else if (player.x === mapX && player.y === mapY) {
                const img = document.createElement("img");
                img.src = playerImage.src;
                img.className = "character-image";
                cell.appendChild(img);
            } else if (stairs.x === mapX && stairs.y === mapY) {
                cell.textContent = ">";
                cell.style.color = "#0ff";
            } else {
                let drawn = false;

                // アイテムを描画
                for (let i = 0; i < items.length; i++) {
                    if (items[i].x === mapX && items[i].y === mapY) {
                        const img = document.createElement("img");
                        img.src = itemImage.src;
                        img.className = "character-image";
                        cell.appendChild(img);
                        drawn = true;
                        break;
                    }
                }

                // 敵を描画
                if (!drawn) {
                    for (let i = 0; i < enemies.length; i++) {
                        if (
                            enemies[i].x === mapX &&
                            enemies[i].y === mapY &&
                            enemies[i].hp > 0
                        ) {
                            if (enemies[i].symbol === "E"){
                                const img = document.createElement("img");
                                img.src = enemy_eImage.src;
                                img.className = "character-image";
                                cell.appendChild(img);
                            }else if (enemies[i].symbol === "S"){
                                const img = document.createElement("img");
                                img.src = enemy_sImage.src;
                                img.className = "character-image";
                                cell.appendChild(img);
                            };

                            break;
                        }
                    }
                }
            }

            board.appendChild(cell);
        }
    }

    document.getElementById("hp").textContent =
        `${player.hp}/${player.maxHp}`;

    document.getElementById("hunger").textContent =
        `${player.hunger}/${player.maxHunger}`;

    document.getElementById("floor").textContent = floor;
    document.getElementById("level").textContent = player.level;
    document.getElementById("exp").textContent = player.exp;
    document.getElementById("nextExp").textContent = player.nextExp;
    const invListText = document.getElementById("inventoryList");
    if (player.inventory.length === 0) {
        invListText.textContent = "なし";
    } else {
        // 持ち物を表示する
        let text = "";
        for (let i = 0; i < player.inventory.length; i++) {
            text += `[${i + 1}] ${player.inventory[i].name} `;
        }
        invListText.textContent = text;
    }
}

function checkLevelUp() {
    while (player.exp >= player.nextExp) {
        player.exp -= player.nextExp; // 超えた分の経験値を持ち越し
        player.level++;
        player.nextExp = Math.floor(player.nextExp * 1.5);

        // ステータス強化
        player.maxHp += 5;
        player.hp = player.maxHp;
        player.atk = player.level;

        addMessage(`レベルが ${player.level} に上がり、最大HPが増えた`);
    }
}

// BFS
function getNextStepBFS(startPos, targetPos, currentEnemy) {
    // 上下左右の移動ベクトル
    const dirs = [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 }
    ];

    // 訪問済みフラグ管理と親ノードの保持
    const visited = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(null));
    const queue = [startPos];
    visited[startPos.y][startPos.x] = { x: startPos.x, y: startPos.y };

    let found = false;

    while (queue.length > 0) {
        const curr = queue.shift();

        // 目的地に到達
        if (curr.x === targetPos.x && curr.y === targetPos.y) {
            found = true;
            break;
        }

        for (const d of dirs) {
            const nx = curr.x + d.x;
            const ny = curr.y + d.y;

            // マップ範囲外チェック
            if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) continue;

            // 既に訪問済みならスキップ
            if (visited[ny][nx] !== null) continue;

            // 壁なら移動不可
            if (map[ny][nx] === 1) continue;
            // 階段があるマスには移動できない
            if (stairs.x === nx && stairs.y === ny) continue;
            // アイテムがあるマスには移動できない
            if (items.some(item => item.x === nx && item.y === ny)) continue;

            // 他の敵がいる場合
            let isBlockedByEnemy = false;
            if (!(nx === targetPos.x && ny === targetPos.y)) {
                for (let other of enemies) {
                    if (other !== currentEnemy && other.hp > 0 && other.x === nx && other.y === ny) {
                        isBlockedByEnemy = true;
                        break;
                    }
                }
            }
            if (isBlockedByEnemy) continue;

            // 訪問完了・キューに追加
            visited[ny][nx] = { x: curr.x, y: curr.y };
            queue.push({ x: nx, y: ny });
        }
    }

    // 経路が見つからなかった場合
    if (!found) return null;

    // ターゲットからスタート地点まで親を辿る
    let curr = targetPos;
    let parent = visited[curr.y][curr.x];

    // スタート地点の次の1マスを探す
    while (parent && !(parent.x === startPos.x && parent.y === startPos.y)) {
        curr = parent;
        parent = visited[curr.y][curr.x];
    }

    return curr; // 次に進むべきマス {x, y}
}

// --- キー入力処理 ---
document.addEventListener("keydown", function(event) {
    let nextX = player.x;
    let nextY = player.y;

    if (event.key === "ArrowUp") nextY--;
    else if (event.key === "ArrowDown") nextY++;
    else if (event.key === "ArrowLeft") nextX--;
    else if (event.key === "ArrowRight") nextX++;
    else if (event.key === "r" || event.key === "R") {
    location.reload();
    return
    }
    // キー入力のなかに数字キーを追加
    else if (event.key >= "1" && event.key <= "6") {
        let index = parseInt(event.key) - 1;
        useItem(index);
    }
    else if (event.code === "Space") {
        event.preventDefault(); // 画面のスクロール防止
        if (player.hp < player.maxHp) {
            if (player.hunger > 0){
                player.hp = Math.min(player.maxHp, player.hp + 1);
                addMessage("その場にとどまりHPが1回復した");}     
        } else {
            addMessage("その場にとどまった");
        }
}
    else if (event.key === "Enter") {
        if (player.x === stairs.x && player.y === stairs.y) {
            floor++;
            changeRandomMap();

            if (floor > maxFloor) {
                alert("ゲームクリア");
                location.reload();
                return;
            }
            addMessage(`${floor}階に降りた`);

            // プレイヤーと階段を安全な場所に配置
            let pPos = getRandomEmptyPosition();
            player.x = pPos.x;
            player.y = pPos.y;

            let sPos = getRandomEmptyPosition();
            stairs.x = sPos.x;
            stairs.y = sPos.y;

            // 敵の再配置
            enemies.length = 0;
            let count = Math.min(floor, 7);
            for (let i = 0; i < count; i++) {
                let ePos = getRandomEmptyPosition();
                // 50%の確率で遠距離敵(type: "ranged")を生成
                let isRanged = Math.random() < 0.5;
                let enemyLevel = floor;
                enemies.push({ 
                    x: ePos.x, 
                    y: ePos.y, 
                    level: enemyLevel,
                    hp: 3 + (enemyLevel - 1) * 2,
                    attack: Math.max(1, Math.floor(enemyLevel / 2)),
                    exp: enemyLevel + 1,
                    type: isRanged ? "ranged" : "melee", // 敵のタイプ
                    symbol: isRanged ? "S" : "E"        // 画面上の表示文字
                });
            }
            // アイテムの再配置
            items.length = 0;
            for (let i = 0;  i < Math.min(floor, 5); i++){
                    let iPos = getRandomEmptyPosition();
                    let newItemType = Math.random() < 0.5 ? "potion" : "food";
                    let newItemName = newItemType === "potion" ? "回復薬" : "貝";
                    items.push({ 
                    x: iPos.x, 
                    y: iPos.y, 
                    type: newItemType, 
                    name: newItemName, 
                    restore: 100 
            });}

        } else {
            addMessage("ここには階段がない");
        }
        drawGame();
        return;
    } else {
        return;
    }
    if (map[nextY][nextX] === 1){
        return
    }

    // 移動先の壁・敵判定
    if (event.key !== " " && map[nextY][nextX] !== 1) {
        let hitEnemy = enemies.find(e => e.hp > 0 && e.x === nextX && e.y === nextY);

        if (hitEnemy) {
            hitEnemy.hp -= player.atk;
            addMessage(`敵に攻撃。残りHP: ${hitEnemy.hp}`);
            if (hitEnemy.hp <= 0){
                player.exp += hitEnemy.exp;
                checkLevelUp()
                addMessage("敵を倒した");;}
        } else {
            // プレイヤーが移動
            player.x = nextX;
            player.y = nextY;

            // アイテム取得判定
            for (let i = items.length - 1; i >= 0; i--) {
                if (items[i].x === player.x && items[i].y === player.y) {
                // カバンの容量制限をチェックする場合
                    if (player.inventory.length >= 6) {
                        addMessage("持ちがいっぱいで拾えない");
                        break;
                    }

                    // カバンに追加
                    player.inventory.push(items[i]);
                    addMessage(`${items[i].name}を拾った`);
                    
                    // マップ上のアイテムを消す
                    items.splice(i, 1);
                }
            }
        }
    }// 敵のターン
        // 1歩歩くごとに 10% の確率で新しい敵が近くに出現
    if (Math.random() < 0.1 && enemies.length < 20) { // 最大6体まで
        let ePos = getRandomEmptyPosition();
        let isRanged = Math.random() < 0.5;
        let enemyLevel = floor;
        enemies.push({
            x: ePos.x,
            y: ePos.y,
            level: enemyLevel,
            hp: 3 + (enemyLevel - 1) * 2,
            attack: Math.max(1, Math.floor(enemyLevel / 2)),
            exp: enemyLevel + 1,
            type: isRanged ? "ranged" : "melee",
            symbol: isRanged ? "S" : "E"
        });
        addMessage("どこかで敵が現れた");
    }
    for (let enemy of enemies) {
        if (enemy.hp <= 0) continue;

        let dx = player.x - enemy.x;
        let dy = player.y - enemy.y;
        let dist = Math.abs(dx) + Math.abs(dy); // 距離の計算

        // 1. プレイヤーと隣接しているなら近接攻撃
        if ((Math.abs(dx) === 1 && dy === 0) || (dx === 0 && Math.abs(dy) === 1)) {
            player.hp -= enemy.attack;
            let enemyName = enemy.symbol === "S" ? "スナイパー" : "敵";
            addMessage(`${enemyName}から ${enemy.attack} のダメージ`);
            if (player.hp <= 0) {
                player.hp = 0;
                alert("ゲームオーバー");
                location.reload();
                return;
            }
        } 
        // 2. 遠距離タイプかつ、縦か横の直線上、かつ距離が3マス以内なら遠距離攻撃
        else if (enemy.type === "ranged" && (dx === 0 || dy === 0) && dist <= 2) {
            // 途中に壁がないかチェックする
            let canSee = true;
            let stepX = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
            let stepY = dy === 0 ? 0 : (dy > 0 ? 1 : -1);
            let checkX = enemy.x + stepX;
            let checkY = enemy.y + stepY;

            while (checkX !== player.x || checkY !== player.y) {
                if (map[checkY][checkX] === 1) { // 途中に壁があれば攻撃できない
                    canSee = false;
                    break;
                }
                checkX += stepX;
                checkY += stepY;
            }

            if (canSee) {
                player.hp -= enemy.attack;
                addMessage(`スナイパーの遠距離攻撃。 ${enemy.attack} のダメージ`);
                if (player.hp <= 0) {
                    player.hp = 0;
                    alert("ゲームオーバー");
                    location.reload();
                    return;
                }
                continue; // 遠距離攻撃したらこの敵のターンは終了
            } else {
                // 壁があって攻撃できない場合は近づく処理へ進む
                const nextStep = getNextStepBFS({ x: enemy.x, y: enemy.y }, { x: player.x, y: player.y }, enemy);
                if (nextStep && !(nextStep.x === player.x && nextStep.y === player.y)) {
                    enemy.x = nextStep.x;
                    enemy.y = nextStep.y;
                }
            }
        } 
        // 3. どちらでもない場合
        else {
            const nextStep = getNextStepBFS({ x: enemy.x, y: enemy.y }, { x: player.x, y: player.y }, enemy);

            // 移動先が見つかり、かつプレイヤーの位置ではない場合
            if (nextStep && !(nextStep.x === player.x && nextStep.y === player.y)) {
                enemy.x = nextStep.x;
                enemy.y = nextStep.y;
            }
        }
    }
    // お腹が減る処理
    player.hunger--;
    if (player.hunger <= 0) {
        player.hunger = 0;
        player.hp--; // お腹が0のときはHPが減る
        addMessage("お腹が空いてHPが減った");
        if (player.hp <= 0) {
            player.hp = 0;
            alert("飢え死にした");
            location.reload();
            return;
        }
    } else if (player.hunger === 20) {
        addMessage("何か食べ物を見つけないと…");
    }
    drawGame();
});
const helpButton = document.getElementById("help-button");
const helpPanel = document.getElementById("help-panel");
const closeHelp = document.getElementById("close-help");

// ？ボタンを押したとき
helpButton.addEventListener("click", function() {
    helpPanel.style.display = "block";
});

// 閉じるボタンを押したとき
closeHelp.addEventListener("click", function() {
    helpPanel.style.display = "none";
});

// 初回
drawGame();


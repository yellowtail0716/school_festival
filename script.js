import { map, MAP_WIDTH, MAP_HEIGHT, changeRandomMap } from './map.js';

// カメラに表示するマスの数
const VIEW_WIDTH = 5;
const VIEW_HEIGHT = 5;

// --- ゲームの状態 ---
const player = {
    x: -1, y: -1,
    hp: 10, maxHp: 10,
    hunger: 100, maxHunger: 100
};

const stairs = { x: -1, y: -1 };

const enemies = [];
const items = [];
let floor = 1;
const maxFloor = 5;

// --- 指定した座標にプレイヤー、敵、階段、アイテムがいないかチェックする関数 ---
function isCellEmpty(x, y) {
    if (map[y][x] === 1) return false; // 壁ならNG
    if (player.x === x && player.y === y) return false; // プレイヤーがいたらNG
    if (stairs.x === x && stairs.y === y) return false; // 階段がいたらNG
    
    // ほかの敵がいないか
    for (let e of enemies) {
        if (e.hp > 0 && e.x === x && e.y === y) return false;
    }
    // ほかのアイテムがいないか
    for (let i of items) {
        if (i.x === x && i.y === y) return false;
    }

    return true; // どこも被っていなければOK！
}

// --- ランダムな空きマスを探す関数 ---
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
        throw new Error("配置できる床がありません！");
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
    enemies.push({
        x: pos.x,
        y: pos.y,
        hp: 3,
        attack: 1
    });
}

// 回復薬を配置
const potionPos = getRandomEmptyPosition();
items.push({
    x: potionPos.x,
    y: potionPos.y,
    type: "potion",
    heal: 5
});
// --- メッセージログ追加用の便利関数 ---
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
                cell.style.backgroundColor = "#707070";
            } else if (player.x === mapX && player.y === mapY) {
                cell.textContent = "@";
                cell.style.color = "#ff0";
            } else if (stairs.x === mapX && stairs.y === mapY) {
                cell.textContent = ">";
                cell.style.color = "#0ff";
            } else {
                let drawn = false;

                // アイテムを描画
                for (let i = 0; i < items.length; i++) {
                    if (items[i].x === mapX && items[i].y === mapY) {
                        cell.textContent = "H";
                        cell.style.color = "#0f0";
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
                            cell.textContent = "E";
                            cell.style.color = "#f00";
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
}

// --- BFS（幅優先探索）による最短経路の最初の1歩を取得する関数 ---
function getNextStepBFS(startPos, targetPos, currentEnemy) {
    // 上下左右の移動ベクトル
    const dirs = [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 }
    ];

    // 訪問済みフラグ管理と親ノードの保持（経路復元用）
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

            // 他の敵がいる場合は障害物扱い（ただし目的地がプレイヤーの場合は通る）
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

    // スタート地点のすぐ次の1マス（最初の一歩）を探す
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
    else if (event.code === "Space") {
        event.preventDefault(); // 画面のスクロール防止
        if (player.hp < player.maxHp) {
            if (player.hunger > 0){
                player.hp = Math.min(player.maxHp, player.hp + 1);
                addMessage("その場にとどまりHPが1回復した。");}     
        } else {
            addMessage("その場にとどまった。");
        }
}
    else if (event.key === "Enter") {
        if (player.x === stairs.x && player.y === stairs.y) {
            floor++;
            changeRandomMap();

            if (floor > maxFloor) {
                alert("ゲームクリア！おめでとう！");
                location.reload();
                return;
            }
            addMessage(`${floor}階に降りた！`);

            // プレイヤーと階段を安全な場所に配置
            let pPos = getRandomEmptyPosition();
            player.x = pPos.x;
            player.y = pPos.y;

            let sPos = getRandomEmptyPosition();
            stairs.x = sPos.x;
            stairs.y = sPos.y;

            // 敵の再配置
            enemies.length = 0;
            let count = Math.min(floor, 4);
            for (let i = 0; i < count; i++) {
                let ePos = getRandomEmptyPosition();
                enemies.push({ x: ePos.x, y: ePos.y, hp: 3, attack: 1 });
            }

            // アイテムの再配置
            items.length = 0;
            let iPos = getRandomEmptyPosition();
            items.push({ x: iPos.x, y: iPos.y, type: "potion", heal: 5 });
        } else {
            addMessage("ここには階段がない！");
        }
        drawGame();
        return;
    } else {
        return;
    }

    // 移動先の壁・敵判定
    if (event.key !== " " && map[nextY][nextX] !== 1) {
        let hitEnemy = enemies.find(e => e.hp > 0 && e.x === nextX && e.y === nextY);

        if (hitEnemy) {
            hitEnemy.hp--;
            addMessage(`敵に攻撃！ 残りHP: ${hitEnemy.hp}`);
            if (hitEnemy.hp <= 0) addMessage("敵を倒した！");
        } else {
            player.x = nextX;
            player.y = nextY;

            // アイテム取得判定
            for (let i = items.length - 1; i >= 0; i--) {
                if (items[i].x === player.x && items[i].y === player.y) {
                    player.hp = Math.min(player.maxHp, player.hp + items[i].heal);
                    addMessage("回復薬を飲んだ！ HP回復！");
                    items.splice(i, 1); //リストから消す
                }
            }
        }
    }
// --- 敵のターン（移動＆攻撃） ---
    for (let enemy of enemies) {
        if (enemy.hp <= 0) continue;

        let dx = player.x - enemy.x;
        let dy = player.y - enemy.y;

        // プレイヤーと隣接している（上下左右のどこか）なら攻撃！
        if ((Math.abs(dx) === 1 && dy === 0) || (dx === 0 && Math.abs(dy) === 1)) {
            player.hp -= enemy.attack;
            addMessage(`敵から ${enemy.attack} のダメージ！`);
            if (player.hp <= 0) {
                player.hp = 0;
                alert("ゲームオーバー");
                location.reload();
                return;
            }
        } else {
            // BFSを使ってプレイヤーへの「次の一歩」を算出する
            const nextStep = getNextStepBFS({ x: enemy.x, y: enemy.y }, { x: player.x, y: player.y }, enemy);

            // 移動先が見つかり、かつプレイヤーの位置ではない（重ならない）場合に移動
            if (nextStep && !(nextStep.x === player.x && nextStep.y === player.y)) {
                enemy.x = nextStep.x;
                enemy.y = nextStep.y;
            }
        }
    }

    // --- お腹が減る処理（1ターン経過） ---
    player.hunger--;
    if (player.hunger <= 0) {
        player.hunger = 0;
        player.hp--; // お腹が0のときはHPが減る！
        addMessage("お腹が空いて力が出ない…！HPが減った！");
        if (player.hp <= 0) {
            player.hp = 0;
            alert("飢え死にしてしまった…ゲームオーバー！");
            location.reload();
            return;
        }
    } else if (player.hunger === 20) {
        addMessage("お腹がグーッと鳴った。何か食べ物を見つけないと……！");
    }
    drawGame();
});

// --- 初回起動 ---
drawGame();
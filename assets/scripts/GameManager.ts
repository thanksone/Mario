const { ccclass, property } = cc._decorator;

enum GameState {
    Menu = 'Menu',
    LevelSelect = 'LevelSelect',
    Playing = 'Playing',
    Paused = 'Paused',
    GameOver = 'GameOver',
    LevelClear = 'LevelClear',
}

@ccclass
export default class GameManager extends cc.Component {
    public static instance: GameManager = null;

    @property(cc.Label)
    public scoreLabel: cc.Label = null;

    @property(cc.Label)
    public lifeLabel: cc.Label = null;

    @property(cc.Label)
    public timerLabel: cc.Label = null;

    @property(cc.Node)
    public startMenuPanel: cc.Node = null;

    @property(cc.Node)
    public levelSelectPanel: cc.Node = null;

    @property(cc.Node)
    public gameOverPanel: cc.Node = null;

    @property(cc.Node)
    public levelClearPanel: cc.Node = null;

    @property
    public startSceneName: string = 'StartMenu';

    @property
    public levelSelectSceneName: string = 'LevelSelect';

    @property
    public firstLevelSceneName: string = 'Level1';

    @property
    public startLives: number = 3;

    @property
    public startTime: number = 400;

    private _score: number = 0;
    private _lives: number = 3;
    private _timer: number = 400;
    private _state: GameState = GameState.Menu;

    public get score(): number { return this._score; }
    public get lives(): number { return this._lives; }
    public get timer(): number { return this._timer; }
    public get state(): GameState { return this._state; }
    public get isPlaying(): boolean { return this._state === GameState.Playing; }

    onLoad() {
        const physicsManager = cc.director.getPhysicsManager();
        physicsManager.enabled = true;
        physicsManager.gravity = cc.v2(0, -320);

        if (GameManager.instance && GameManager.instance !== this) {
            this.node.destroy();
            return;
        }
        GameManager.instance = this;
    }
    start() {
        this.resetGameData();
        this.showStartMenu();
        this.updateUI();
    }

    onDestroy() {
        if (GameManager.instance === this) {
            GameManager.instance = null;
        }
    }

    private resetGameData() {
        this._score = 0;
        this._lives = this.startLives;
        this._timer = this.startTime;
    }

    private setState(nextState: GameState) {
        this._state = nextState;

        if (this.startMenuPanel) this.startMenuPanel.active = nextState === GameState.Menu;
        if (this.levelSelectPanel) this.levelSelectPanel.active = nextState === GameState.LevelSelect;
        if (this.gameOverPanel) this.gameOverPanel.active = nextState === GameState.GameOver;
        if (this.levelClearPanel) this.levelClearPanel.active = nextState === GameState.LevelClear;

        this.updateUI();
    }

    public showStartMenu() {
        this.unschedule(this.countdownTimer);
        this.setState(GameState.Menu);
    }

    public showLevelSelect() {
        this.unschedule(this.countdownTimer);
        this.setState(GameState.LevelSelect);
    }

    public loadStartScene() {
        cc.director.loadScene(this.startSceneName);
    }

    public loadLevelSelectScene() {
        cc.director.loadScene(this.levelSelectSceneName);
    }

    public loadFirstLevel() {
        this.startLevel(this.firstLevelSceneName);
    }

    public startLevel(levelName: string = this.firstLevelSceneName) {
        this.unschedule(this.countdownTimer);
        this._timer = this.startTime;
        this.setState(GameState.Playing);

        const currentScene = cc.director.getScene();
        if (currentScene && currentScene.name === levelName) {
            this.schedule(this.countdownTimer, 1);
            return;
        }

        cc.director.loadScene(levelName, () => {
            this.setState(GameState.Playing);
            this.updateUI();
            this.schedule(this.countdownTimer, 1);
        });
    }

    public restartCurrentLevel() {
        const scene = cc.director.getScene();
        this._timer = this.startTime;
        this.setState(GameState.Playing);

        if (scene) {
            cc.director.loadScene(scene.name, () => {
                this.schedule(this.countdownTimer, 1);
            });
        }
    }

    private countdownTimer = () => {
        if (this._state !== GameState.Playing) return;

        this._timer--;
        if (this._timer <= 0) {
            this._timer = 0;
            this.playerDie();
        }
        this.updateUI();
    };

    public addScore(points: number) {
        if (points <= 0) return;
        this._score += points;
        this.updateUI();
    }

    public addLife(amount: number = 1) {
        this._lives += amount;
        this.updateUI();
    }

    public playerDie() {
        if (this._state !== GameState.Playing) return;

        this._lives--;
        this.updateUI();

        if (this._lives <= 0) {
            this.gameOver();
            return;
        }

        cc.director.emit('player_reborn');
    }

    public gameOver() {
        this.unschedule(this.countdownTimer);
        this.setState(GameState.GameOver);
        cc.director.emit('game_over');
    }

    public levelClear() {
        if (this._state !== GameState.Playing) return;

        this.addScore(this._timer * 10);
        this.unschedule(this.countdownTimer);
        this.setState(GameState.LevelClear);
        cc.director.emit('level_clear');
    }

    public returnToMenu() {
        this.resetGameData();
        this.showStartMenu();
    }

    private updateUI() {
        if (this.scoreLabel) this.scoreLabel.string = 'SCORE\n' + this.padNumber(this._score, 6);
        if (this.lifeLabel) this.lifeLabel.string = 'LIFE\n' + this._lives;
        if (this.timerLabel) this.timerLabel.string = 'TIME\n' + this.padNumber(this._timer, 3);
    }

    private padNumber(value: number, length: number): string {
        let text = String(value);
        while (text.length < length) text = '0' + text;
        return text;
    }
}

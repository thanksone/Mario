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

	private static bgmId: number = -1;

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
	private respawnScheduled: boolean = false;

	public get score(): number { return this._score; }
	public get lives(): number { return this._lives; }
	public get timer(): number { return this._timer; }
	public get state(): GameState { return this._state; }
	public get isPlaying(): boolean { return this._state === GameState.Playing; }

	onLoad() {
		this.cleanupPlaceholderSceneNodes();
		cc.director.getPhysicsManager().enabled = true;

		if (GameManager.instance && GameManager.instance !== this) {
			this.node.destroy();
			return;
		}
		GameManager.instance = this;
	}


	private cleanupPlaceholderSceneNodes() {
		const names = ['Wall_Left', 'Wall_Right'];
		for (const n of names) {
			const node = cc.find('Canvas/World/Walls/' + n);
			if (node) {
				node.active = false;
				node.opacity = 0;
				const col = node.getComponent(cc.PhysicsBoxCollider);
				if (col) col.enabled = false;
				const rb = node.getComponent(cc.RigidBody);
				if (rb) rb.enabled = false;
			}
		}

		const groundFolder = cc.find('Canvas/World/Ground');
		if (groundFolder) {
			groundFolder.opacity = 0;
			const sp = groundFolder.getComponent(cc.Sprite);
			if (sp) sp.enabled = false;
		}

		const oldMushroom = cc.find('Canvas/World/Items/Mushroom');
		if (oldMushroom) {
			oldMushroom.destroy();
		}
	}

	start() {
		this.resetGameData();
		this.resetLevelObjects();
		this.playBGM();
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

	private resetLevelObjects() {
		this.respawnScheduled = false;
		this.unschedule(this.emitPlayerReborn);

		// Remove spawned power-ups. The mushroom prefab is stored in assets/prefabs,
		// so it is safe to clear runtime children under World/Items.
		const items = cc.find('Canvas/World/Items');
		if (items) items.removeAllChildren();

		// Ask Player, Enemies, Blocks, etc. to return to their initial state.
		cc.director.emit('level_start');
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
		this.resetLevelObjects();
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
		this._lives = this.startLives;
		this._timer = this.startTime;

		const currentScene = cc.director.getScene();
		if (currentScene && currentScene.name === levelName) {
			this.resetLevelObjects();
			this.setState(GameState.Playing);
			this.schedule(this.countdownTimer, 1);
			return;
		}

		cc.director.loadScene(levelName, () => {
			this.resetLevelObjects();
			this.setState(GameState.Playing);
			this.updateUI();
			this.schedule(this.countdownTimer, 1);
		});
	}

	public restartCurrentLevel() {
		this.unschedule(this.countdownTimer);
		this._lives = this.startLives;
		this._timer = this.startTime;
		this.resetLevelObjects();
		this.setState(GameState.Playing);
		this.schedule(this.countdownTimer, 1);
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
		if (this.respawnScheduled) return;

		this._lives--;
		this.updateUI();

		if (this._lives <= 0) {
			this.gameOver();
			return;
		}

		// Do not respawn in the same physics/contact frame.  If Mario is
		// overlapping an enemy when he dies, immediate respawn can cause Cocos 2.4
		// to keep him in a bad contact state or damage him again before the next
		// frame.  Wait briefly, then let PlayerController rebuild the body/collider.
		this.respawnScheduled = true;
		this.scheduleOnce(this.emitPlayerReborn, 0.7);
	}

	private emitPlayerReborn = () => {
		this.respawnScheduled = false;
		if (this._state !== GameState.Playing) return;
		cc.director.emit('player_reborn');
	};

	public gameOver() {
		this.unschedule(this.countdownTimer);
		this.respawnScheduled = false;
		this.unschedule(this.emitPlayerReborn);
		GameManager.playEffect('audio/Game Over');
		this.setState(GameState.GameOver);
		cc.director.emit('game_over');
	}

	public levelClear() {
		if (this._state !== GameState.Playing) return;

		GameManager.playEffect('audio/levelClear');
		this.addScore(this._timer * 10);
		this.unschedule(this.countdownTimer);
		this.setState(GameState.LevelClear);
		cc.director.emit('level_clear');
	}

	public returnToMenu() {
		this.resetGameData();
		this.showStartMenu();
	}

	private playBGM() {
		if (GameManager.bgmId !== -1) return;

		cc.loader.loadRes('audio/bgm_1', cc.AudioClip, (err: Error, clip: cc.AudioClip) => {
			if (!err && clip) {
				GameManager.bgmId = cc.audioEngine.playMusic(clip, true);
				cc.audioEngine.setMusicVolume(0.45);
			}
		});
	}

	public static playEffect(path: string, volume: number = 1) {
		cc.loader.loadRes(path, cc.AudioClip, (err: Error, clip: cc.AudioClip) => {
			if (!err && clip) {
				cc.audioEngine.playEffect(clip, false);
			}
		});
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

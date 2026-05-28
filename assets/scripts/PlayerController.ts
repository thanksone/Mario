const { ccclass, property } = cc._decorator;

import GameManager from './GameManager';
import EnemyController from './EnemyController';
import MushroomController from './MushroomController';

@ccclass
export default class PlayerController extends cc.Component {
	// Not marked with @property on purpose.
	// If these are @property, Cocos Creator keeps old values serialized in Level1.fire
	// and changing this script will appear to do nothing. Change these two numbers here.
	public moveSpeed: number = 150;
	public jumpForce: number = 400;

	@property
	public stompBounceForce: number = 450;

	@property
	public fallDeathY: number = -300;

	@property
	public invincibleSeconds: number = 1;

	@property(cc.AudioSource)
	public jumpSound: cc.AudioSource = null;

	@property(cc.AudioSource)
	public dieSound: cc.AudioSource = null;

	@property(cc.AudioSource)
	public powerUpSound: cc.AudioSource = null;

	private rb: cc.RigidBody = null;
	private anim: cc.Animation = null;
	private sprite: cc.Sprite = null;
	private smallAtlas: cc.SpriteAtlas = null;
	private bigAtlas: cc.SpriteAtlas = null;
	private currentAnimName: string = '';
	private animTimer: number = 0;
	private animFrameIndex: number = 0;
	private moveDirection: number = 0;
	private groundContactCount: number = 0;
	private isBig: boolean = false;
	private isDeadOrReborn: boolean = false;
	private invincibleTimer: number = 0;
	private initialPosition: cc.Vec2 = cc.v2(0, 0);

	onLoad() {
		this.rb = this.getComponent(cc.RigidBody);
		this.anim = this.getComponent(cc.Animation);
		this.sprite = this.getComponent(cc.Sprite);
		this.initialPosition = cc.v2(this.node.x, this.node.y);

		if (this.rb) this.rb.enabledContactListener = true;
		this.loadSpriteAtlases();

		cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
		cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
		cc.director.on('player_reborn', this.reborn, this);
		cc.director.on('level_start', this.resetPlayerForNewLevel, this);
		cc.director.on('game_over', this.stopPlayer, this);
		cc.director.on('level_clear', this.stopPlayer, this);
	}

	onDestroy() {
		cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
		cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
		cc.director.off('player_reborn', this.reborn, this);
		cc.director.off('level_start', this.resetPlayerForNewLevel, this);
		cc.director.off('game_over', this.stopPlayer, this);
		cc.director.off('level_clear', this.stopPlayer, this);
	}

	private onKeyDown(event: cc.Event.EventKeyboard) {
		if (!GameManager.instance || !GameManager.instance.isPlaying || this.isDeadOrReborn) return;

		switch (event.keyCode) {
			case cc.macro.KEY.a:
			case cc.macro.KEY.left:
				this.moveDirection = -1;
				this.node.scaleX = -Math.abs(this.node.scaleX);
				break;
			case cc.macro.KEY.d:
			case cc.macro.KEY.right:
				this.moveDirection = 1;
				this.node.scaleX = Math.abs(this.node.scaleX);
				break;
			case cc.macro.KEY.w:
			case cc.macro.KEY.up:
			case cc.macro.KEY.space:
				this.tryJump();
				break;
		}
	}

	private onKeyUp(event: cc.Event.EventKeyboard) {
		switch (event.keyCode) {
			case cc.macro.KEY.a:
			case cc.macro.KEY.left:
				if (this.moveDirection < 0) this.moveDirection = 0;
				break;
			case cc.macro.KEY.d:
			case cc.macro.KEY.right:
				if (this.moveDirection > 0) this.moveDirection = 0;
				break;
		}
	}

	private tryJump() {
		if (!this.rb || !this.isGrounded()) return;

		const v = this.rb.linearVelocity;
		this.rb.linearVelocity = cc.v2(v.x, this.jumpForce);
		this.groundContactCount = 0;

		if (this.jumpSound) this.jumpSound.play();
		else GameManager.playEffect('audio/jump');
		this.playAnimation('jump');
	}

	update(dt: number) {
		if (!this.rb) return;

		if (this.invincibleTimer > 0) this.invincibleTimer -= dt;

		if (!GameManager.instance || !GameManager.instance.isPlaying || this.isDeadOrReborn) {
			const v = this.rb.linearVelocity;
			this.rb.linearVelocity = cc.v2(0, v.y);
			this.updateFrameAnimation(dt);
			return;
		}

		const v = this.rb.linearVelocity;
		this.rb.linearVelocity = cc.v2(this.moveDirection * this.moveSpeed, v.y);
		this.updateAnimation();
		this.updateFrameAnimation(dt);

		if (this.node.y < this.fallDeathY) {
			this.takeDamage(true);
		}
	}

	onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
		const enemy = otherCollider.node.getComponent(EnemyController);
		if (enemy) {
			this.handleEnemyContact(enemy);
			return;
		}

		const mushroom = otherCollider.node.getComponent(MushroomController);
		if (mushroom) {
			this.growBig();
			mushroom.collect();
			return;
		}

		if (this.isStandingOn(otherCollider)) {
			this.groundContactCount++;
		}
	}

	onEndContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
		if (this.isGroundObject(otherCollider)) {
			this.groundContactCount = Math.max(0, this.groundContactCount - 1);
		}
	}

	onPreSolve(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
		// Enemy damage/stomp is handled by script logic. Disable the physical
		// enemy-player collision so Goomba cannot push Mario, especially while
		// Mario is dying, reborn, invincible, or during game over.
		if (otherCollider.node.getComponent(EnemyController)) {
			contact.disabled = true;
		}
	}

	public handleEnemyContact(enemy: EnemyController) {
		if (!GameManager.instance || !GameManager.instance.isPlaying || this.isDeadOrReborn) return;
		if (!enemy || enemy.isKilled) return;

		if (this.isStompingEnemy(enemy)) {
			enemy.stompKilled();
			this.bounceAfterStomp();
		} else {
			this.takeDamage(false);
		}
	}

	private isStompingEnemy(enemy: EnemyController): boolean {
		const playerBox = this.node.getBoundingBoxToWorld();
		const enemyBox = enemy.node.getBoundingBoxToWorld();
		const fallingOrStill = !this.rb || this.rb.linearVelocity.y <= 80;

		// Mario kills the enemy only when his feet are above the enemy's head.
		const feetNearEnemyHead = playerBox.yMin >= enemyBox.yMax - 16;
		const centerAboveEnemy = this.node.y > enemy.node.y;
		const horizontalOverlap = playerBox.xMax > enemyBox.xMin + 6 && playerBox.xMin < enemyBox.xMax - 6;

		return fallingOrStill && feetNearEnemyHead && centerAboveEnemy && horizontalOverlap;
	}

	private bounceAfterStomp() {
		if (!this.rb) return;

		const v = this.rb.linearVelocity;
		this.rb.linearVelocity = cc.v2(v.x, this.stompBounceForce);
	}

	private isGroundObject(otherCollider: cc.PhysicsCollider): boolean {
		const name = otherCollider.node.name.toLowerCase();
		return name.indexOf('ground') >= 0 ||
			name.indexOf('wall') >= 0 ||
			name.indexOf('platform') >= 0 ||
			name.indexOf('block') >= 0 ||
			name.indexOf('tile') >= 0;
	}

	private isStandingOn(otherCollider: cc.PhysicsCollider): boolean {
		if (!this.isGroundObject(otherCollider)) return false;

		const playerBox = this.node.getBoundingBoxToWorld();
		const otherBox = otherCollider.node.getBoundingBoxToWorld();
		const horizontalOverlap = playerBox.xMax > otherBox.xMin + 4 && playerBox.xMin < otherBox.xMax - 4;
		const playerFeetAboveTop = playerBox.yMin >= otherBox.yMax - 14;

		return horizontalOverlap && playerFeetAboveTop && this.node.y > otherCollider.node.y;
	}

	private isGrounded(): boolean {
		if (this.groundContactCount > 0) return true;

		// Backup: if contact count is not updated, allow jumping when nearly stopped
		// vertically.  This fixes Cocos 2.4 contact-normal instability.
		return !!this.rb && Math.abs(this.rb.linearVelocity.y) < 2;
	}

	public growBig() {
		if (this.isBig) {
			if (GameManager.instance) GameManager.instance.addScore(1000);
			return;
		}

		this.isBig = true;
		this.node.scaleX = this.node.scaleX < 0 ? -1.5 : 1.5;
		this.node.scaleY = 1.5;
		this.node.setContentSize(40, 64);

		if (this.powerUpSound) this.powerUpSound.play();
		else GameManager.playEffect('audio/PowerUp');
		if (GameManager.instance) GameManager.instance.addScore(1000);
	}

	public takeDamage(forceDeath: boolean = false) {
		if (this.invincibleTimer > 0 || this.isDeadOrReborn || !GameManager.instance || !GameManager.instance.isPlaying) return;

		if (this.isBig && !forceDeath) {
			this.isBig = false;
			this.node.scaleX = this.node.scaleX < 0 ? -1 : 1;
			this.node.scaleY = 1;
			this.node.setContentSize(32, 32);
			GameManager.playEffect('audio/powerDown');
			this.invincibleTimer = this.invincibleSeconds;
			return;
		}

		this.handleDeath();
	}

	public handleDeath() {
		if (this.isDeadOrReborn) return;

		this.isDeadOrReborn = true;
		this.moveDirection = 0;

		if (this.dieSound) this.dieSound.play();
		else GameManager.playEffect('audio/loseOneLife');

		// Stop all physical motion immediately.  The collider is temporarily
		// disabled so enemies cannot keep pushing Mario while he is dead or
		// while the Game Over panel is showing.
		const collider = this.getComponent(cc.PhysicsCollider);
		if (collider) collider.enabled = false;
		if (this.rb) {
			this.rb.linearVelocity = cc.v2(0, 0);
			this.rb.angularVelocity = 0;
			this.rb.enabled = false;
		}

		if (GameManager.instance) GameManager.instance.playerDie();
	}


	private resetPlayerForNewLevel() {
		this.node.active = true;
		this.node.setPosition(this.initialPosition.x, this.initialPosition.y);
		this.node.scaleX = 1;
		this.node.scaleY = 1;
		this.node.setContentSize(32, 32);
		this.isBig = false;
		this.isDeadOrReborn = false;
		this.invincibleTimer = 0;
		this.groundContactCount = 0;
		this.moveDirection = 0;

		const collider = this.getComponent(cc.PhysicsCollider);
		if (collider) collider.enabled = true;

		if (this.rb) {
			this.rb.enabled = true;
			this.rb.linearVelocity = cc.v2(0, 0);
			this.rb.angularVelocity = 0;
		}
		this.playAnimation('idle');
	}


	private reborn() {
		this.node.active = true;
		this.node.setPosition(this.initialPosition.x, this.initialPosition.y);
		this.node.scaleX = 1;
		this.node.scaleY = 1;
		this.node.setContentSize(32, 32);
		this.isBig = false;
		this.isDeadOrReborn = false;
		this.invincibleTimer = this.invincibleSeconds;
		this.groundContactCount = 0;
		this.moveDirection = 0;

		const collider = this.getComponent(cc.PhysicsCollider);
		if (collider) collider.enabled = true;

		if (this.rb) {
			this.rb.enabled = true;
			this.rb.linearVelocity = cc.v2(0, 0);
			this.rb.angularVelocity = 0;
		}
		this.playAnimation('idle');
	}

	private stopPlayer() {
		this.moveDirection = 0;
		if (this.rb) this.rb.linearVelocity = cc.v2(0, 0);
		this.playAnimation('idle');
	}

	private updateAnimation() {
		if (!this.isGrounded()) {
			this.playAnimation('jump');
		} else if (this.moveDirection !== 0) {
			this.playAnimation('walk');
		} else {
			this.playAnimation('idle');
		}
	}

	private loadSpriteAtlases() {
		cc.loader.loadRes('player/mario_small', cc.SpriteAtlas, (err: Error, atlas: cc.SpriteAtlas) => {
			if (!err && atlas) {
				this.smallAtlas = atlas;
				this.setPlayerFrame('idle', 0);
			}
		});

		cc.loader.loadRes('player/mario_big', cc.SpriteAtlas, (err: Error, atlas: cc.SpriteAtlas) => {
			if (!err && atlas) this.bigAtlas = atlas;
		});
	}

	private updateFrameAnimation(dt: number) {
		if (!this.sprite) return;

		this.animTimer += dt;
		if (this.currentAnimName === 'walk') {
			if (this.animTimer >= 0.1) {
				this.animTimer = 0;
				this.animFrameIndex = (this.animFrameIndex + 1) % 3;
				this.setPlayerFrame('walk', this.animFrameIndex);
			}
		} else if (this.currentAnimName === 'jump') {
			this.setPlayerFrame('jump', 0);
		} else {
			this.setPlayerFrame('idle', 0);
		}
	}

	private setPlayerFrame(animName: string, index: number) {
		if (!this.sprite) return;

		const atlas = this.isBig ? this.bigAtlas : this.smallAtlas;
		if (!atlas) return;

		const prefix = this.isBig ? 'mario_big_' : 'mario_small_';
		let frameNumbers: number[] = [0];
		if (animName === 'walk') frameNumbers = [1, 2, 3];
		else if (animName === 'jump') frameNumbers = [5];

		const frameName = prefix + frameNumbers[Math.min(index, frameNumbers.length - 1)] + '.png';
		const frame = atlas.getSpriteFrame(frameName) || atlas.getSpriteFrame(prefix + '0.png');
		if (frame) this.sprite.spriteFrame = frame;
	}

	private playAnimation(name: string) {
		if (this.currentAnimName !== name) {
			this.currentAnimName = name;
			this.animTimer = 999;
			this.animFrameIndex = 0;
		}

		if (!this.anim) return;
		const state = this.anim.getAnimationState(name);
		if (state && !state.isPlaying) this.anim.play(name);
	}
}

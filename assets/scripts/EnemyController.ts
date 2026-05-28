const { ccclass, property } = cc._decorator;

import GameManager from './GameManager';

@ccclass
export default class EnemyController extends cc.Component {
	@property
	public speed: number = -120;

	@property
	public scoreValue: number = 100;

	@property
	public minX: number = -430;

	@property
	public maxX: number = 430;

	@property(cc.AudioSource)
	public stompSound: cc.AudioSource = null;

	private rb: cc.RigidBody = null;
	private anim: cc.Animation = null;
	private _isKilled: boolean = false;
	private initialPosition: cc.Vec2 = cc.v2(0, 0);
	private initialScaleX: number = 1;
	private initialScaleY: number = 1;
	private initialSpeed: number = -120;

	public get isKilled(): boolean { return this._isKilled; }

	onLoad() {
		this.rb = this.getComponent(cc.RigidBody);
		this.anim = this.getComponent(cc.Animation);
		this.initialPosition = cc.v2(this.node.x, this.node.y);
		this.initialScaleX = this.node.scaleX;
		this.initialScaleY = this.node.scaleY;
		this.initialSpeed = this.speed;

		if (this.rb) this.rb.enabledContactListener = true;
		cc.director.on('level_start', this.resetEnemy, this);
	}

	onDestroy() {
		cc.director.off('level_start', this.resetEnemy, this);
	}

	update() {
		if (this._isKilled || !GameManager.instance || !GameManager.instance.isPlaying) {
			if (this.rb) this.rb.linearVelocity = cc.v2(0, this.rb.linearVelocity.y);
			return;
		}

		if (this.node.x <= this.minX && this.speed < 0) this.turnAround();
		if (this.node.x >= this.maxX && this.speed > 0) this.turnAround();

		if (this.node.y < -360) {
			this.resetEnemy();
			return;
		}

		if (this.rb) {
			const v = this.rb.linearVelocity;
			this.rb.linearVelocity = cc.v2(this.speed, v.y);
		}

		const sx = Math.abs(this.node.scaleX);
		this.node.scaleX = this.speed < 0 ? -sx : sx;

		const player = cc.find('Canvas/World/Player');
		if (player && this.node.getBoundingBoxToWorld().intersects(player.getBoundingBoxToWorld())) {
			const playerController: any = player.getComponent('PlayerController');
			if (playerController && typeof playerController.handleEnemyContact === 'function') {
				playerController.handleEnemyContact(this);
			}
		}
	}

	onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
		if (this._isKilled) return;
		if (!GameManager.instance || !GameManager.instance.isPlaying) return;

		const player: any = otherCollider.node.getComponent('PlayerController');
		if (player && typeof player.handleEnemyContact === 'function') {
			player.handleEnemyContact(this);
			return;
		}

		const name = otherCollider.node.name.toLowerCase();
		if (name.indexOf('mushroom') >= 0) {
			contact.disabled = true;
			return;
		}

		if (name.indexOf('wall') >= 0 || name.indexOf('block') >= 0 || name.indexOf('pipe') >= 0 || name.indexOf('enemyturn') >= 0) {
			this.turnAround();
		}
	}

	onPreSolve(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
		const name = otherCollider.node.name.toLowerCase();
		// Enemy-player interaction is handled by PlayerController.handleEnemyContact.
		// Disable the physical collision so the enemy cannot push Mario.
		if (otherCollider.node.getComponent('PlayerController') || name.indexOf('mushroom') >= 0) {
			contact.disabled = true;
		}
	}

	private turnAround() {
		this.speed = -this.speed;
	}

	public stompKilled() {
		if (this._isKilled) return;

		this._isKilled = true;
		if (this.rb) {
			this.rb.linearVelocity = cc.v2(0, 0);
			this.rb.enabled = false;
		}
		const collider = this.getComponent(cc.PhysicsCollider);
		if (collider) collider.enabled = false;

		if (this.stompSound) this.stompSound.play();
		if (GameManager.instance) GameManager.instance.addScore(this.scoreValue);

		if (this.anim && this.anim.getAnimationState('dead')) {
			this.anim.play('dead');
		}

		this.node.scaleY = Math.max(0.25, Math.abs(this.node.scaleY) * 0.35);
		this.scheduleOnce(() => {
			this.node.active = false;
		}, 0.25);
	}

	private resetEnemy() {
		this.unscheduleAllCallbacks();
		this.node.active = true;
		this._isKilled = false;
		this.speed = this.initialSpeed;
		this.node.setPosition(this.initialPosition);
		this.node.scaleX = this.initialScaleX;
		this.node.scaleY = this.initialScaleY;

		const collider = this.getComponent(cc.PhysicsCollider);
		if (collider) collider.enabled = true;

		if (this.rb) {
			this.rb.enabled = true;
			this.rb.linearVelocity = cc.v2(0, 0);
			this.rb.angularVelocity = 0;
		}
	}
}

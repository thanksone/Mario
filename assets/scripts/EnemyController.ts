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

	public get isKilled(): boolean { return this._isKilled; }

	onLoad() {
		this.rb = this.getComponent(cc.RigidBody);
		this.anim = this.getComponent(cc.Animation);

		const collider = this.getComponent(cc.PhysicsCollider);
		if (collider) {
			collider.enabledContactListener = true;
		}
	}

	update() {
		if (this._isKilled || !this.rb || !GameManager.instance || !GameManager.instance.isPlaying) return;

		if (this.node.x <= this.minX && this.speed < 0) this.turnAround();
		if (this.node.x >= this.maxX && this.speed > 0) this.turnAround();

		const v = this.rb.linearVelocity;
		this.rb.linearVelocity = cc.v2(this.speed, v.y);

		const sx = Math.abs(this.node.scaleX);
		this.node.scaleX = this.speed < 0 ? -sx : sx;
	}

	onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
		if (this._isKilled) return;

		const player = otherCollider.node.getComponent('PlayerController');
		if (player) return;

		const name = otherCollider.node.name.toLowerCase();
		if (name.indexOf('wall') >= 0 || name.indexOf('block') >= 0 || name.indexOf('pipe') >= 0 || name.indexOf('enemyturn') >= 0 || name.indexOf('flag') >= 0) {
			this.turnAround();
			return;
		}

		const normal = contact.getWorldManifold().normal;
		if (Math.abs(normal.x) > 0.4) this.turnAround();
	}

	private turnAround() {
		this.speed = -this.speed;
	}

	public stompKilled() {
		if (this._isKilled) return;

		this._isKilled = true;
		if (this.rb) this.rb.linearVelocity = cc.v2(0, 0);
		if (this.stompSound) this.stompSound.play();
		if (GameManager.instance) GameManager.instance.addScore(this.scoreValue);

		if (this.anim && this.anim.getAnimationState('dead')) {
			this.anim.play('dead');
		}

		this.node.scaleY = Math.max(0.25, Math.abs(this.node.scaleY) * 0.35);
		this.scheduleOnce(() => {
			this.node.destroy();
		}, 0.25);
	}
}

const { ccclass, property } = cc._decorator;

import GameManager from './GameManager';

@ccclass
export default class MushroomController extends cc.Component {
	@property
	public speed: number = 120;

	@property(cc.AudioSource)
	public collectSound: cc.AudioSource = null;

	private rb: cc.RigidBody = null;
	private collected: boolean = false;

	onLoad() {
		this.rb = this.getComponent(cc.RigidBody);
		if (this.rb) this.rb.enabledContactListener = true;
		cc.director.on('level_start', this.removeSpawnedMushroom, this);
	}

	onDestroy() {
		cc.director.off('level_start', this.removeSpawnedMushroom, this);
	}

	update() {
		if (this.collected) return;
		if (!GameManager.instance || !GameManager.instance.isPlaying) {
			if (this.rb) this.rb.linearVelocity = cc.v2(0, 0);
			return;
		}

		if (this.node.y < -360) {
			this.node.destroy();
			return;
		}

		if (this.rb) {
			const v = this.rb.linearVelocity;
			this.rb.linearVelocity = cc.v2(this.speed, v.y);
		}

		const player = cc.find('Canvas/World/Player');
		if (player && this.node.getBoundingBoxToWorld().intersects(player.getBoundingBoxToWorld())) {
			this.collectByPlayer(player);
		}
	}

	onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
		if (this.collected) return;
		if (!GameManager.instance || !GameManager.instance.isPlaying) return;

		const player: any = otherCollider.node.getComponent('PlayerController');
		if (player) {
			this.collectByPlayer(otherCollider.node);
			return;
		}

		const name = otherCollider.node.name.toLowerCase();
		if (name.indexOf('enemy') >= 0 || name.indexOf('goomba') >= 0) {
			contact.disabled = true;
			return;
		}

		const shouldTurn = name.indexOf('wall') >= 0 || name.indexOf('block') >= 0 || name.indexOf('pipe') >= 0 || name.indexOf('enemyturn') >= 0;
		if (shouldTurn) this.speed = -this.speed;
	}

	onPreSolve(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
		const name = otherCollider.node.name.toLowerCase();
		if (name.indexOf('enemy') >= 0 || name.indexOf('goomba') >= 0) {
			contact.disabled = true;
		}
	}

	private collectByPlayer(playerNode: cc.Node) {
		const player: any = playerNode.getComponent('PlayerController');
		if (player && typeof player.growBig === 'function') {
			player.growBig();
			this.collect();
		}
	}

	public collect() {
		if (this.collected) return;

		this.collected = true;
		if (this.collectSound) this.collectSound.play();
		this.node.destroy();
	}

	private removeSpawnedMushroom() {
		// Runtime mushrooms should not remain when starting/restarting/returning to menu.
		this.node.destroy();
	}
}

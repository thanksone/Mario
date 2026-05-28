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
		if (this.rb) {
			this.rb.enabledContactListener = true;
			this.rb.gravityScale = 0;
		}

		const collider = this.getComponent(cc.PhysicsCollider);
		if (collider) collider.sensor = true;

		this.node.zIndex = 30;
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

		if (this.node.x < -520 || this.node.x > 760 || this.node.y < -360) {
			this.node.destroy();
			return;
		}

		if (this.rb) {
			this.rb.linearVelocity = cc.v2(this.speed, 0);
		} else {
			this.node.x += this.speed * cc.director.getDeltaTime();
		}

		const player = cc.find('Canvas/World/Player');
		if (player && this.node.getBoundingBoxToWorld().intersects(player.getBoundingBoxToWorld())) {
			this.collectByPlayer(player);
		}
	}

	onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
		if (this.collected) return;

		const player: any = otherCollider.node.getComponent('PlayerController');
		if (player) {
			this.collectByPlayer(otherCollider.node);
			return;
		}

		// Sensor mushroom should never physically push enemies/blocks.
		contact.disabled = true;
	}

	onPreSolve(contact: cc.PhysicsContact) {
		contact.disabled = true;
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
		else GameManager.playEffect('audio/PowerUp');
		this.node.destroy();
	}

	private removeSpawnedMushroom() {
		// Destroy runtime mushrooms when starting/restarting.  Keep inactive editor template nodes alone.
		if (this.node.activeInHierarchy || this.node.name.indexOf('Spawned') >= 0) {
			this.node.destroy();
		}
	}
}

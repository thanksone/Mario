const { ccclass } = cc._decorator;

import GameManager from './GameManager';

@ccclass
export default class GoalFlagController extends cc.Component {
	private playerNode: cc.Node = null;
	private triggered: boolean = false;

	onLoad() {
		const rb = this.getComponent(cc.RigidBody);
		if (rb) rb.enabledContactListener = true;

		const collider = this.getComponent(cc.PhysicsCollider);
		if (collider) collider.sensor = true;

		cc.director.on('level_start', this.resetFlag, this);
	}

	start() {
		this.playerNode = cc.find('Canvas/World/Player');
	}

	onDestroy() {
		cc.director.off('level_start', this.resetFlag, this);
	}

	update() {
		if (this.triggered) return;
		if (!GameManager.instance || !GameManager.instance.isPlaying) return;

		if (!this.playerNode || !this.playerNode.isValid) {
			this.playerNode = cc.find('Canvas/World/Player');
		}
		if (!this.playerNode) return;

		if (this.node.getBoundingBoxToWorld().intersects(this.playerNode.getBoundingBoxToWorld())) {
			this.triggerGoal();
		}
	}

	onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
		if (otherCollider.node.getComponent('PlayerController')) {
			this.triggerGoal();
		}
	}

	onPreSolve(contact: cc.PhysicsContact) {
		contact.disabled = true;
	}

	private triggerGoal() {
		if (this.triggered) return;
		if (!GameManager.instance || !GameManager.instance.isPlaying) return;

		this.triggered = true;
		GameManager.instance.levelClear();
	}

	private resetFlag() {
		this.triggered = false;
	}
}

const { ccclass } = cc._decorator;

import GameManager from './GameManager';

@ccclass
export default class GoalFlagController extends cc.Component {
	onLoad() {
		const collider = this.getComponent(cc.PhysicsCollider);
		if (collider) {
			collider.enabledContactListener = true;
			collider.sensor = true;
		}
	}

	update() {
		if (!GameManager.instance || !GameManager.instance.isPlaying) return;

		const playerNode = cc.find('Canvas/World/Player');
		if (!playerNode || !playerNode.getComponent('PlayerController')) return;

		if (this.node.getBoundingBoxToWorld().intersects(playerNode.getBoundingBoxToWorld())) {
			GameManager.instance.levelClear();
		}
	}

	onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
		if (otherCollider.node.getComponent('PlayerController')) {
			if (GameManager.instance) GameManager.instance.levelClear();
		}
	}
}

const { ccclass } = cc._decorator;

import GameManager from './GameManager';

@ccclass
export default class GoalFlagController extends cc.Component {
    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
        if (otherCollider.node.getComponent('PlayerController')) {
            if (GameManager.instance) GameManager.instance.levelClear();
        }
    }
}

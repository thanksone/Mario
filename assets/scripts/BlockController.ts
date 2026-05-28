const { ccclass, property } = cc._decorator;

import GameManager from './GameManager';

@ccclass
export default class BlockController extends cc.Component {
    @property(cc.Prefab)
    public mushroomPrefab: cc.Prefab = null;

    @property(cc.AudioSource)
    public hitSound: cc.AudioSource = null;

    @property
    public spawnOffsetY: number = 40;

    @property
    public scoreValue: number = 100;

    private isTriggered: boolean = false;
    private originalPosition: cc.Vec2 = cc.v2(0, 0);

    onLoad() {
        this.originalPosition = cc.v2(this.node.x, this.node.y);

        const collider = this.getComponent(cc.PhysicsCollider);
        if (collider) collider.enabledContactListener = true;
    }

    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
        if (this.isTriggered) return;

        const player = otherCollider.node.getComponent('PlayerController');
        if (!player) return;

        const playerBelow = otherCollider.node.y < this.node.y - 5;
        const normal = contact.getWorldManifold().normal;
        const playerMovingUp = normal.y > 0.1 || otherCollider.node.y < this.node.y;

        if (playerBelow && playerMovingUp) this.triggerBlock();
    }

    private triggerBlock() {
        this.isTriggered = true;

        if (this.hitSound) this.hitSound.play();
        if (GameManager.instance) GameManager.instance.addScore(this.scoreValue);

        this.bumpBlock();
        this.spawnMushroom();

        const sprite = this.getComponent(cc.Sprite);
        if (sprite) sprite.node.color = cc.color(130, 130, 130, 255);
    }

    private bumpBlock() {
        this.node.setPosition(this.originalPosition.x, this.originalPosition.y + 8);
        this.scheduleOnce(() => {
            this.node.setPosition(this.originalPosition.x, this.originalPosition.y);
        }, 0.08);
    }

    private spawnMushroom() {
        if (!this.mushroomPrefab || !this.node.parent) return;

        const mushroom = cc.instantiate(this.mushroomPrefab);
        mushroom.setPosition(this.node.x, this.node.y + this.spawnOffsetY);
        this.node.parent.addChild(mushroom);
    }
}

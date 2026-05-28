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
	private originalColor: cc.Color = cc.Color.WHITE;
	private playerNode: cc.Node = null;

	onLoad() {
		this.originalPosition = cc.v2(this.node.x, this.node.y);

		const sprite = this.getComponent(cc.Sprite);
		if (sprite) this.originalColor = sprite.node.color.clone();

		const rb = this.getComponent(cc.RigidBody);
		if (rb) rb.enabledContactListener = true;

		const collider = this.getComponent(cc.PhysicsCollider);
		if (collider) collider.sensor = false;

		cc.director.on('level_start', this.resetBlock, this);
	}

	start() {
		this.playerNode = cc.find('Canvas/World/Player');
	}

	onDestroy() {
		cc.director.off('level_start', this.resetBlock, this);
	}

	update() {
		// Backup detector. In Cocos Creator 2.4, the contact callback on a static
		// block can be missed or fire after the physics solver already separates
		// the player. This check makes the block trigger reliably when Mario's head
		// reaches the bottom of the block while he is below it.
		if (this.isTriggered) return;
		if (!GameManager.instance || !GameManager.instance.isPlaying) return;

		if (!this.playerNode || !this.playerNode.isValid) {
			this.playerNode = cc.find('Canvas/World/Player');
		}
		if (!this.playerNode) return;

		if (this.isHitFromBelow(this.playerNode)) {
			this.triggerBlock();
		}
	}

	onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
		if (this.isTriggered) return;
		if (!GameManager.instance || !GameManager.instance.isPlaying) return;

		const player: any = otherCollider.node.getComponent('PlayerController');
		if (!player) return;

		if (this.isHitFromBelow(otherCollider.node)) {
			this.triggerBlock();
		}
	}

	private isHitFromBelow(playerNode: cc.Node): boolean {
		const playerBox = playerNode.getBoundingBoxToWorld();
		const blockBox = this.node.getBoundingBoxToWorld();
		const playerRb = playerNode.getComponent(cc.RigidBody);

		// Player must be below the block and moving upward / just got stopped by the block.
		const verticalVelocity = playerRb ? playerRb.linearVelocity.y : 0;
		const movingUpOrJustStopped = verticalVelocity > -120;

		// Use generous tolerance because Cocos 2.4 contact is resolved before/after callbacks
		// depending on the frame. Strict yMax <= yMin + 18 often fails.
		const playerBelowBlock = playerNode.y < this.node.y;
		const headCloseToBlockBottom = playerBox.yMax >= blockBox.yMin - 30 && playerBox.yMax <= blockBox.yMin + 45;
		const horizontallyOverlapping = playerBox.xMax > blockBox.xMin + 2 && playerBox.xMin < blockBox.xMax - 2;

		return movingUpOrJustStopped && playerBelowBlock && headCloseToBlockBottom && horizontallyOverlapping;
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
		if (!this.mushroomPrefab) {
			cc.warn('[BlockController] mushroomPrefab is not assigned on ' + this.node.name);
			return;
		}

		const mushroom = cc.instantiate(this.mushroomPrefab);
		let targetParent = this.node.parent;
		const world = cc.find('Canvas/World');
		if (world) {
			let items = world.getChildByName('Items');
			if (!items) {
				items = new cc.Node('Items');
				world.addChild(items);
			}
			targetParent = items;
		}

		targetParent.addChild(mushroom);

		const worldPos = this.node.convertToWorldSpaceAR(cc.v2(0, this.spawnOffsetY));
		const localPos = targetParent.convertToNodeSpaceAR(worldPos);
		mushroom.setPosition(localPos);
		mushroom.active = true;

		const rb = mushroom.getComponent(cc.RigidBody);
		if (rb) {
			rb.enabledContactListener = true;
			rb.linearVelocity = cc.v2(80, 0);
		}
	}

	private resetBlock() {
		this.isTriggered = false;
		this.unscheduleAllCallbacks();
		this.node.setPosition(this.originalPosition);

		const sprite = this.getComponent(cc.Sprite);
		if (sprite) sprite.node.color = this.originalColor;
	}
}

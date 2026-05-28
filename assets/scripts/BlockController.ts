const { ccclass, property } = cc._decorator;

import GameManager from './GameManager';

@ccclass
export default class BlockController extends cc.Component {
	@property(cc.Prefab)
	public mushroomPrefab: cc.Prefab = null;

	@property(cc.AudioSource)
	public hitSound: cc.AudioSource = null;

	@property
	public spawnOffsetY: number = 46;

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
		const vy = playerRb ? playerRb.linearVelocity.y : 0;

		// Mario's head must overlap the lower part of the block, and Mario must be below it.
		const horizontallyOverlapping = playerBox.xMax > blockBox.xMin + 2 && playerBox.xMin < blockBox.xMax - 2;
		const headNearBlockBottom = playerBox.yMax >= blockBox.yMin - 45 && playerBox.yMax <= blockBox.yMin + 55;
		const bodyBelowBlockCenter = playerNode.y < this.node.y;
		const movingUpOrStoppedByBlock = vy > -180;

		return horizontallyOverlapping && headNearBlockBottom && bodyBelowBlockCenter && movingUpOrStoppedByBlock;
	}

	private triggerBlock() {
		if (this.isTriggered) return;
		this.isTriggered = true;

		if (this.hitSound) this.hitSound.play();
		else GameManager.playEffect('audio/powerUpAppear');
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

		const world = cc.find('Canvas/World');
		let targetParent = world ? world.getChildByName('Items') : null;
		if (!targetParent && world) {
			targetParent = new cc.Node('Items');
			world.addChild(targetParent);
		}
		if (!targetParent) targetParent = this.node.parent;

		const mushroom = cc.instantiate(this.mushroomPrefab);
		targetParent.addChild(mushroom);

		// Blocks and Items are both under World in this project, so this is the most stable placement.
		mushroom.setPosition(this.node.x, this.node.y + this.spawnOffsetY);
		mushroom.active = true;
		mushroom.opacity = 255;
		mushroom.zIndex = 30;
		mushroom.name = 'SpawnedMushroom';
		mushroom.setContentSize(32, 32);

		const sprite = mushroom.getComponent(cc.Sprite);
		if (sprite) {
			// Force-load the item atlas at runtime. This avoids the black placeholder icon
			// if the prefab's sprite frame is not resolved by Cocos after import.
			cc.loader.loadRes('effects_UI_tiles/items', cc.SpriteAtlas, (err: Error, atlas: cc.SpriteAtlas) => {
				if (!err && atlas && mushroom && mushroom.isValid) {
					const frame = atlas.getSpriteFrame('items_46.png') || atlas.getSpriteFrame('items_0.png');
					if (frame) sprite.spriteFrame = frame;
				}
			});
		}

		const collider = mushroom.getComponent(cc.PhysicsCollider);
		if (collider) {
			collider.sensor = true; // do not push the enemy/player/ground; collection is via overlap check
			if ((collider as any).size) (collider as any).size = cc.size(32, 32);
		}

		const rb = mushroom.getComponent(cc.RigidBody);
		if (rb) {
			rb.enabledContactListener = true;
			rb.gravityScale = 0; // keep mushroom visible above the block; do not fall through the stage
			rb.linearVelocity = cc.v2(90, 0);
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

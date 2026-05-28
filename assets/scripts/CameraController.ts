const { ccclass, property } = cc._decorator;

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

@ccclass
export default class CameraController extends cc.Component {
	@property(cc.Node)
	public playerNode: cc.Node = null;

	@property
	public minX: number = 0;

	@property
	public maxX: number = 520;

	@property
	public followY: boolean = false;

	@property
	public minY: number = 0;

	@property
	public maxY: number = 0;

	@property
	public smoothFactor: number = 8;

	private uiNode: cc.Node = null;
	private backgroundNode: cc.Node = null;

	onLoad() {
		this.uiNode = cc.find('Canvas/UI');
		this.backgroundNode = cc.find('Canvas/World/Background');
	}

	update(dt: number) {
		if (!this.playerNode) return;

		let targetX = this.node.x;
		if (this.maxX > this.minX) {
			targetX = clamp(this.playerNode.x, this.minX, this.maxX);
		} else {
			// If maxX <= minX, intentionally lock the camera.
			targetX = this.minX;
		}

		const targetY = this.followY
			? (this.maxY > this.minY ? clamp(this.playerNode.y, this.minY, this.maxY) : this.minY)
			: 0;

		const t = Math.min(1, this.smoothFactor * dt);
		this.node.x = this.node.x + (targetX - this.node.x) * t;
		this.node.y = this.node.y + (targetY - this.node.y) * t;

		// UI is under the same Canvas/world camera in this simple project.
		// Move it with the camera so SCORE/LIFE/TIME stay on screen.
		if (!this.uiNode || !this.uiNode.isValid) this.uiNode = cc.find('Canvas/UI');
		if (this.uiNode) {
			this.uiNode.x = this.node.x;
			this.uiNode.y = this.node.y;
		}

		// The level only has one screen-sized background image. Move it with
		// the camera so the right side never becomes black.
		if (!this.backgroundNode || !this.backgroundNode.isValid) this.backgroundNode = cc.find('Canvas/World/Background');
		if (this.backgroundNode) {
			this.backgroundNode.x = this.node.x;
			this.backgroundNode.y = this.node.y;
		}
	}
}

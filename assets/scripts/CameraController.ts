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
	public maxX: number = 0;

	@property
	public followY: boolean = false;

	@property
	public minY: number = 0;

	@property
	public maxY: number = 0;

	@property
	public smoothFactor: number = 8;

	update(dt: number) {
		if (!this.playerNode) return;

		// If minX == maxX, the camera is locked. This project currently uses a
		// one-screen background, so locking prevents the right half becoming black
		// and keeps UI labels from drifting away.
		const targetX = this.maxX <= this.minX ? this.minX : clamp(this.playerNode.x, this.minX, this.maxX);
		const targetY = this.followY ? (this.maxY <= this.minY ? this.minY : clamp(this.playerNode.y, this.minY, this.maxY)) : this.node.y;
		const t = Math.min(1, this.smoothFactor * dt);

		this.node.x = this.node.x + (targetX - this.node.x) * t;
		this.node.y = this.node.y + (targetY - this.node.y) * t;
	}
}

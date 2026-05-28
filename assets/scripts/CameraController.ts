const { ccclass, property } = cc._decorator;

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

@ccclass
export default class CameraController extends cc.Component {
	@property(cc.Node)
	public playerNode: cc.Node = null;

	// These are camera-center limits. If the background is only one screen wide,
	// the script will automatically clamp the camera to x = 0 to avoid black area.
	@property
	public minX: number = 0;

	@property
	public maxX: number = 0;

	@property
	public followY: boolean = false;

	@property
	public minY: number = 0;

	@property
	public maxY: number = 600;

	@property
	public smoothFactor: number = 8;

	private getCameraXLimits(): { min: number, max: number } {
		let minLimit = this.minX;
		let maxLimit = this.maxX;

		const canvas = cc.find('Canvas');
		const background = cc.find('Canvas/World/Background');

		if (canvas && background) {
			const viewHalfWidth = canvas.width * 0.5;
			const bgLeft = background.x - background.anchorX * background.width;
			const bgRight = background.x + (1 - background.anchorX) * background.width;

			const bgMin = bgLeft + viewHalfWidth;
			const bgMax = bgRight - viewHalfWidth;

			if (bgMax >= bgMin) {
				minLimit = Math.max(minLimit, bgMin);
				maxLimit = Math.min(maxLimit, bgMax);
			} else {
				// Background is not wider than the screen. Keep camera centered.
				minLimit = 0;
				maxLimit = 0;
			}
		}

		if (maxLimit < minLimit) {
			const middle = (minLimit + maxLimit) * 0.5;
			minLimit = middle;
			maxLimit = middle;
		}

		return { min: minLimit, max: maxLimit };
	}

	update(dt: number) {
		if (!this.playerNode) return;

		const limits = this.getCameraXLimits();
		const targetX = clamp(this.playerNode.x, limits.min, limits.max);
		const targetY = this.followY ? clamp(this.playerNode.y, this.minY, this.maxY) : this.node.y;
		const t = Math.min(1, this.smoothFactor * dt);

		this.node.x = this.node.x + (targetX - this.node.x) * t;
		this.node.y = this.node.y + (targetY - this.node.y) * t;
	}
}

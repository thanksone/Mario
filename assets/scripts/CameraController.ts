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
    public maxX: number = 2000;

    @property
    public followY: boolean = false;

    @property
    public minY: number = 0;

    @property
    public maxY: number = 600;

    @property
    public smoothFactor: number = 8;

    update(dt: number) {
        if (!this.playerNode) return;

        const currentX = this.node.x;
        const currentY = this.node.y;
        const targetX = clamp(this.playerNode.x, this.minX, this.maxX);
        const targetY = this.followY ? clamp(this.playerNode.y, this.minY, this.maxY) : currentY;
        const t = Math.min(1, this.smoothFactor * dt);

        this.node.x = currentX + (targetX - currentX) * t;
        this.node.y = currentY + (targetY - currentY) * t;
    }
}

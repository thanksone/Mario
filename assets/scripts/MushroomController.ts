const { ccclass, property } = cc._decorator;

@ccclass
export default class MushroomController extends cc.Component {
    @property
    public speed: number = 120;

    @property(cc.AudioSource)
    public collectSound: cc.AudioSource = null;

    private rb: cc.RigidBody = null;
    private collected: boolean = false;

    onLoad() {
        this.rb = this.getComponent(cc.RigidBody);

        const collider = this.getComponent(cc.PhysicsCollider);
        if (collider) collider.enabledContactListener = true;
    }

    update() {
        if (!this.rb || this.collected) return;

        const v = this.rb.linearVelocity;
        this.rb.linearVelocity = cc.v2(this.speed, v.y);
    }

    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
        if (this.collected) return;

        const player: any = otherCollider.node.getComponent('PlayerController');
        if (player && typeof player.growBig === 'function') {
            player.growBig();
            this.collect();
            return;
        }

        const normal = contact.getWorldManifold().normal;
        if (Math.abs(normal.x) > 0.4) this.speed = -this.speed;
    }

    public collect() {
        if (this.collected) return;

        this.collected = true;
        if (this.collectSound) this.collectSound.play();
        this.node.destroy();
    }
}

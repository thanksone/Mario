const { ccclass, property } = cc._decorator;

import GameManager from './GameManager';
import EnemyController from './EnemyController';
import MushroomController from './MushroomController';

@ccclass
export default class PlayerController extends cc.Component {
    @property
    public moveSpeed: number = 250;

    @property
    public jumpForce: number = 600;

    @property
    public stompBounceForce: number = 450;

    @property
    public fallDeathY: number = -300;

    @property
    public invincibleSeconds: number = 1;

    @property(cc.AudioSource)
    public jumpSound: cc.AudioSource = null;

    @property(cc.AudioSource)
    public dieSound: cc.AudioSource = null;

    @property(cc.AudioSource)
    public powerUpSound: cc.AudioSource = null;

    private rb: cc.RigidBody = null;
    private anim: cc.Animation = null;
    private moveDirection: number = 0;
    private groundContactCount: number = 0;
    private isBig: boolean = false;
    private isDeadOrReborn: boolean = false;
    private invincibleTimer: number = 0;
    private initialPosition: cc.Vec2 = cc.v2(0, 0);

    onLoad() {
        this.rb = this.getComponent(cc.RigidBody);
        this.anim = this.getComponent(cc.Animation);
        this.initialPosition = cc.v2(this.node.x, this.node.y);

        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
        cc.director.on('player_reborn', this.reborn, this);
        cc.director.on('game_over', this.stopPlayer, this);
        cc.director.on('level_clear', this.stopPlayer, this);
    }

    onDestroy() {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
        cc.director.off('player_reborn', this.reborn, this);
        cc.director.off('game_over', this.stopPlayer, this);
        cc.director.off('level_clear', this.stopPlayer, this);
    }

    private onKeyDown(event: cc.Event.EventKeyboard) {
        if (!GameManager.instance || !GameManager.instance.isPlaying || this.isDeadOrReborn) return;

        switch (event.keyCode) {
            case cc.macro.KEY.a:
            case cc.macro.KEY.left:
                this.moveDirection = -1;
                this.node.scaleX = -Math.abs(this.node.scaleX);
                break;
            case cc.macro.KEY.d:
            case cc.macro.KEY.right:
                this.moveDirection = 1;
                this.node.scaleX = Math.abs(this.node.scaleX);
                break;
            case cc.macro.KEY.w:
            case cc.macro.KEY.up:
            case cc.macro.KEY.space:
                this.tryJump();
                break;
        }
    }

    private onKeyUp(event: cc.Event.EventKeyboard) {
        switch (event.keyCode) {
            case cc.macro.KEY.a:
            case cc.macro.KEY.left:
                if (this.moveDirection < 0) this.moveDirection = 0;
                break;
            case cc.macro.KEY.d:
            case cc.macro.KEY.right:
                if (this.moveDirection > 0) this.moveDirection = 0;
                break;
        }
    }

    private tryJump() {
        if (!this.rb || !this.isGrounded()) return;

        const v = this.rb.linearVelocity;
        this.rb.linearVelocity = cc.v2(v.x, this.jumpForce);
        this.groundContactCount = 0;

        if (this.jumpSound) this.jumpSound.play();
        this.playAnimation('jump');
    }

    update(dt: number) {
        if (!this.rb) return;

        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;

        if (!GameManager.instance || !GameManager.instance.isPlaying || this.isDeadOrReborn) {
            const v = this.rb.linearVelocity;
            this.rb.linearVelocity = cc.v2(0, v.y);
            return;
        }

        const v = this.rb.linearVelocity;
        this.rb.linearVelocity = cc.v2(this.moveDirection * this.moveSpeed, v.y);
        this.updateAnimation();

        if (this.node.y < this.fallDeathY) {
            this.takeDamage(true);
        }
    }

    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
        const enemy = otherCollider.node.getComponent(EnemyController);
        if (enemy) {
            this.handleEnemyContact(enemy);
            return;
        }

        const mushroom = otherCollider.node.getComponent(MushroomController);
        if (mushroom) {
            this.growBig();
            mushroom.collect();
            return;
        }

        if (this.isStandingOn(otherCollider, contact)) {
            this.groundContactCount++;
        }
    }

    onEndContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
        if (this.isGroundObject(otherCollider)) {
            this.groundContactCount = Math.max(0, this.groundContactCount - 1);
        }
    }

    private handleEnemyContact(enemy: EnemyController) {
        if (enemy.isKilled) return;

        const falling = !!this.rb && this.rb.linearVelocity.y <= 0;
        const playerAboveEnemy = this.node.y > enemy.node.y + 8;

        if (falling && playerAboveEnemy) {
            enemy.stompKilled();
            this.bounceAfterStomp();
        } else {
            this.takeDamage(false);
        }
    }

    private bounceAfterStomp() {
        if (!this.rb) return;

        const v = this.rb.linearVelocity;
        this.rb.linearVelocity = cc.v2(v.x, this.stompBounceForce);
    }

    private isGroundObject(otherCollider: cc.PhysicsCollider): boolean {
        const name = otherCollider.node.name.toLowerCase();
        return name.indexOf('ground') >= 0 ||
            name.indexOf('wall') >= 0 ||
            name.indexOf('platform') >= 0 ||
            name.indexOf('block') >= 0 ||
            name.indexOf('tile') >= 0;
    }

    private isStandingOn(otherCollider: cc.PhysicsCollider, contact: cc.PhysicsContact): boolean {
        if (!this.isGroundObject(otherCollider)) return false;

        const otherY = otherCollider.node.y;
        const selfY = this.node.y;
        if (selfY < otherY) return false;

        const normal = contact.getWorldManifold().normal;
        return normal.y < -0.2 || selfY > otherY;
    }

    private isGrounded(): boolean {
        return this.groundContactCount > 0;
    }

    public growBig() {
        if (this.isBig) {
            if (GameManager.instance) GameManager.instance.addScore(1000);
            return;
        }

        this.isBig = true;
        this.node.scaleX = this.node.scaleX < 0 ? -1.5 : 1.5;
        this.node.scaleY = 1.5;

        if (this.powerUpSound) this.powerUpSound.play();
        if (GameManager.instance) GameManager.instance.addScore(1000);
    }

    public takeDamage(forceDeath: boolean = false) {
        if (this.invincibleTimer > 0 || this.isDeadOrReborn || !GameManager.instance || !GameManager.instance.isPlaying) return;

        if (this.isBig && !forceDeath) {
            this.isBig = false;
            this.node.scaleX = this.node.scaleX < 0 ? -1 : 1;
            this.node.scaleY = 1;
            this.invincibleTimer = this.invincibleSeconds;
            return;
        }

        this.handleDeath();
    }

    public handleDeath() {
        if (this.isDeadOrReborn) return;

        this.isDeadOrReborn = true;
        this.moveDirection = 0;

        if (this.dieSound) this.dieSound.play();
        if (GameManager.instance) GameManager.instance.playerDie();
        if (this.rb) this.rb.linearVelocity = cc.v2(0, 0);
    }

    private reborn() {
        this.node.setPosition(this.initialPosition.x, this.initialPosition.y);
        this.node.scaleX = 1;
        this.node.scaleY = 1;
        this.isBig = false;
        this.isDeadOrReborn = false;
        this.invincibleTimer = this.invincibleSeconds;
        this.groundContactCount = 0;

        if (this.rb) this.rb.linearVelocity = cc.v2(0, 0);
        this.playAnimation('idle');
    }

    private stopPlayer() {
        this.moveDirection = 0;
        if (this.rb) this.rb.linearVelocity = cc.v2(0, 0);
        this.playAnimation('idle');
    }

    private updateAnimation() {
        if (!this.isGrounded()) {
            this.playAnimation('jump');
        } else if (this.moveDirection !== 0) {
            this.playAnimation('walk');
        } else {
            this.playAnimation('idle');
        }
    }

    private playAnimation(name: string) {
        if (!this.anim) return;

        const state = this.anim.getAnimationState(name);
        if (state && !state.isPlaying) this.anim.play(name);
    }
}

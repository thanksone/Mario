# Assignment 02 - Web Mario

## Project Description

This project is a Mario-style 2D platform game made with Cocos Creator 2.4.8 for Assignment 02: Web Mario.

The player controls Mario to move, jump, interact with question blocks, collect a mushroom power-up, avoid or defeat enemies, and reach the goal flag.

## Development Environment

- Engine: Cocos Creator 2.4.8
- Language: TypeScript
- Platform: Web

## How to Play

1. Open the deployed web page or run the project in Cocos Creator.
2. Click `Start Game`.
3. Select `Level1`.
4. Control Mario and reach the goal flag.

## Controls

| Action | Key |
|---|---|
| Move Left | `A` or Left Arrow |
| Move Right | `D` or Right Arrow |
| Jump | `W`, Up Arrow, or Space |

## Implemented Features

### Complete Game Process

- Start menu
- Level select menu
- Game view
- Game over panel
- Level clear panel
- Restart behavior
- Game state control
- Life reset when restarting the game

### Basic Rules

#### World Map

- Physics is enabled.
- Player, ground, question block, enemy, mushroom, and goal flag use physics/collider behavior.
- The background and UI are handled so that the screen remains visible during gameplay.
- At least one playable level is implemented.

#### Level Design

- Static ground is included.
- A question mark block is included.
- The question mark block can interact with Mario.

#### Player

- Mario has physics behavior.
- Mario can move left and right using keyboard input.
- Mario can jump.
- Mario loses life when hit by an enemy.
- Mario loses life when falling out of bounds.
- Mario respawns after losing life.
- Mario becomes larger after collecting a mushroom.

#### Enemy

- One enemy type is implemented.
- The enemy patrols horizontally.
- Mario loses life if he touches the enemy from the side.
- Mario can defeat the enemy by jumping on its head.

#### Question Block

- The question mark block reacts when Mario hits it from below.
- After being hit, it spawns a mushroom.
- The mushroom can be collected by Mario.
- After collecting the mushroom, Mario becomes larger.

### Sound Effects

- Background music is included.
- Jump sound effect is included.
- Damage/death sound effect is included.
- Power-up sound effect is included.
- Question block / mushroom sound effect is included.
- Enemy stomp sound effect is included.
- Sound effects do not intentionally stop the BGM.

### UI

- Player life display
- Player score display
- Timer display
- Start menu
- Level select menu
- Game over panel
- Level clear panel

## Not Implemented

- Player and enemy animations are not implemented in the final submitted project.
- Bonus features such as Firebase membership, leaderboard, multiplayer, and backend server are not implemented.

## Main Scripts

| File | Purpose |
|---|---|
| `assets/scripts/GameManager.ts` | Controls game process, UI panels, score, life, timer, restart, and reset logic. |
| `assets/scripts/PlayerController.ts` | Controls Mario movement, jumping, damage, respawn, mushroom power-up, and enemy interaction. |
| `assets/scripts/EnemyController.ts` | Controls enemy movement, patrol behavior, enemy defeat, and enemy reset. |
| `assets/scripts/BlockController.ts` | Controls question block hit detection and mushroom spawning. |
| `assets/scripts/MushroomController.ts` | Controls mushroom movement and collection. |
| `assets/scripts/GoalFlagController.ts` | Controls level clear detection when Mario touches the goal flag. |
| `assets/scripts/CameraController.ts` | Controls camera/background/UI behavior. |
| `assets/scripts/MenuButtonController.ts` | Controls menu buttons and level selection buttons. |

## Deployment

Firebase Hosting URL:

```txt
Please fill in your Firebase URL here.
```

GitHub / GitLab URL:

```txt
Please fill in your repository URL here.
```

## Build Instructions

1. Open the project in Cocos Creator 2.4.8.
2. Open `assets/scenes/Level1.fire`.
3. Use `Project -> Build` or `Project -> Build Release`.
4. Select Web Mobile or Web Desktop.
5. Build the project.
6. Deploy the generated `build/web-mobile` or `build/web-desktop` folder to Firebase Hosting.

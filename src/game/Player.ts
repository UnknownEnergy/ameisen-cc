import {SpeechBubble} from "./SpeechBubble";
import {Scene} from "phaser";

export class Player {
    sprite: Phaser.Physics.Arcade.Sprite;
    nameText: Phaser.GameObjects.Text;
    speechBubble: SpeechBubble;

    constructor(scene: Scene, x: number, y: number, texture: string, frame: string | number) {
        this.sprite = scene.physics.add.sprite(x, y, texture, frame).setOrigin(0.5, 1);
        this.nameText = scene.add.text(x, y - 105, '', {fontSize: '16px'}).setOrigin(0.5);
        this.speechBubble = new SpeechBubble(scene, x, y - 120);

        // @ts-ignore
        this.sprite.body.setSize(this.sprite.width / 2, 20);
        // @ts-ignore
        this.sprite.body.setOffset(this.sprite.width / 4, this.sprite.height - 20);
    }

    update() {
        const {x, y} = this.sprite;
        this.nameText.setPosition(x, y - 105);
        this.speechBubble.setPosition(x, y - 120);
    }
}

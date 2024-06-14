export class SpeechBubble extends Phaser.GameObjects.Container {
    background: Phaser.GameObjects.Graphics;
    private _text: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        // Create background graphic
        this.background = scene.add.graphics();
        this.add(this.background);

        // Create text object
        this._text = scene.add.text(0, 0, '', {fontSize: '16px', color: '#000'});
        this._text.setOrigin(0.5, 0.5);
        this.add(this._text);

        // Adjust position of text
        this._text.setPosition(0, -20);

        // Add to scene
        scene.add.existing(this);

        // Initially hidden
        this.setVisible(false);
    }

    setText(text: string, backgroundColor: number = 0xcccccc) {
        this._text.setText(text);

        // Update background size based on text size
        this.background.clear();
        this.background.fillStyle(backgroundColor, 1);
        this.background.fillRoundedRect(-this._text.width / 2 - 10, -this._text.height / 2 - 30, this._text.width + 20, this._text.height + 20, 10);
    }

    get text(): Phaser.GameObjects.Text {
        return this._text;
    }

    show() {
        this.setVisible(true);
    }

    hide() {
        this.setVisible(false);
        this.setText("");
    }

    startTypingTimer() {
        this.scene.time.addEvent({
            delay: 8000,
            callback: () => {
                this.hide();
            },
            loop: false
        });
    }
}

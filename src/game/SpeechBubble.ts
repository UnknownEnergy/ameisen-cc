export class SpeechBubble extends Phaser.GameObjects.Container {
    background: Phaser.GameObjects.Graphics;
    text: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        // Create background graphic
        this.background = scene.add.graphics();
        this.add(this.background);

        // Create text object
        this.text = scene.add.text(0, 0, '', {fontSize: '16px', color: '#000'});
        this.text.setOrigin(0.5, 0.5);
        this.add(this.text);

        // Adjust position of text
        this.text.setPosition(0, -20);

        // Add to scene
        scene.add.existing(this);

        // Initially hidden
        this.setVisible(false);
    }

    setText(text: string, backgroundColor: number = 0xcccccc) {
        this.text.setText(text);

        // Update background size based on text size
        this.background.clear();
        this.background.fillStyle(backgroundColor, 1);
        this.background.fillRoundedRect(-this.text.width / 2 - 10, -this.text.height - 20, this.text.width + 20, this.text.height + 20, 10);
    }

    show() {
        this.setVisible(true);
    }

    hide() {
        this.setVisible(false);
    }

    startTypingTimer() {
        this.scene.time.addEvent({
            delay: 5000,
            callback: () => {
                this.hide();
            },
            loop: false
        });
    }
}

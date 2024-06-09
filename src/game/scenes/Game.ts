import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class Game extends Scene {
    camera: Phaser.Cameras.Scene2D.Camera;
    player: Phaser.GameObjects.Image;
    playerSpeed: number;  // Speed at which the player moves
    targetPosition: Phaser.Math.Vector2 | null; // Target position to move towards

    constructor() {
        super('Game');
        this.playerSpeed = 200;  // Set player speed (adjust as necessary)
        this.targetPosition = null; // Initially, no target position
    }

    create() {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x00ff00);

        const graphics = this.add.graphics();

        // Define the dimensions for the grid
        const rectSize = 50; // Width and height of each rectangle

        // Parse the CSV data
        const mapData = this.cache.text.get('map');
        const rows = mapData.trim().split('\n').map((row: string) => row.split(','));

        // Create grid of rectangles using images
        rows.forEach((row: any[], rowIndex: number) => {
            row.forEach((cell, colIndex) => {
                const x = colIndex * rectSize;
                const y = rowIndex * rectSize;
                const texture = cell === '1' ? 'water' : 'grass'; // 1 for water, 0 for grass

                this.add.image(x + rectSize / 2, y + rectSize / 2, texture).setDisplaySize(rectSize, rectSize);
            });
        });

        // Get the center position of the screen
        const screenWidth = this.cameras.main.width;
        const screenHeight = this.cameras.main.height;
        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;

        // Add the player image in the middle of the screen
        this.player = this.add.image(centerX, centerY, 'gast').setDisplaySize(rectSize, rectSize);

        // Add input listener for mouse click or touch
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.targetPosition = new Phaser.Math.Vector2(pointer.x, pointer.y);
        });

        EventBus.emit('current-scene-ready', this);
    }

    override update(time: number, delta: number) {
        if (this.targetPosition) {
            const direction = this.targetPosition.clone().subtract(this.player.getCenter());
            const distance = direction.length();

            if (distance > this.playerSpeed * delta / 1000) {  // If the distance is greater than the step size
                direction.normalize();
                this.player.x += direction.x * this.playerSpeed * delta / 1000;
                this.player.y += direction.y * this.playerSpeed * delta / 1000;
            } else {
                this.player.setPosition(this.targetPosition.x, this.targetPosition.y);
                this.targetPosition = null;  // Stop moving
            }
        }
    }
}

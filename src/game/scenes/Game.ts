import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class Game extends Scene {
    camera: Phaser.Cameras.Scene2D.Camera;
    player: Phaser.GameObjects.Image;
    playerSpeed: number;  // Speed at which the world moves
    targetPosition: Phaser.Math.Vector2 | null; // Target position to move towards
    mapData: string[][];
    gridSize: number;

    constructor() {
        super('Game');
        this.playerSpeed = 800;  // Set player speed (adjust as necessary)
        this.targetPosition = null; // Initially, no target position
        this.gridSize = 50; // Size of each grid cell
    }

    create() {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x000000);
        this.camera.setZoom(2);  // Set the zoom level to 2x

        // Parse the CSV data
        const mapData = this.cache.text.get('map');
        this.mapData = mapData.trim().split('\n').map((row: string) => row.split(','));

        // Create grid of rectangles using images
        this.mapData.forEach((row: any[], rowIndex: number) => {
            row.forEach((cell, colIndex) => {
                const x = colIndex * this.gridSize;
                const y = rowIndex * this.gridSize;
                const texture = cell === '1' ? 'water' : 'grass';

                this.add.image(x + this.gridSize / 2, y + this.gridSize / 2, texture).setDisplaySize(this.gridSize, this.gridSize);
            });
        });

        // Get the center position of the screen
        const screenWidth = this.cameras.main.width;
        const screenHeight = this.cameras.main.height;
        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;

        // Add the player image in the middle of the screen
        this.player = this.add.image(centerX, centerY, 'gast')
            .setDisplaySize(this.gridSize, this.gridSize)
            .setDepth(1)  // Ensure the player is above other tiles
            .setOrigin(0.5, 1);

        // Add input listener for mouse click or touch
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.targetPosition = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
        });

        EventBus.emit('current-scene-ready', this);
    }

    isCollidable(x: number, y: number): boolean {
        const col = Math.floor(x / this.gridSize);
        const row = Math.floor(y / this.gridSize);

        if (row >= 0 && row < this.mapData.length && col >= 0 && col < this.mapData[row].length) {
            return this.mapData[row][col] === '1'; // '1' indicates a water tile
        }

        return false;
    }

    override update(time: number, delta: number) {
        if (this.targetPosition) {
            const direction = this.targetPosition.clone().subtract(new Phaser.Math.Vector2(this.player.x, this.player.y));
            const distance = direction.length();

            if (distance > this.playerSpeed * delta / 1000) {  // If the distance is greater than the step size
                direction.normalize();
                const offsetX = direction.x * this.playerSpeed * delta / 1000;
                const offsetY = direction.y * this.playerSpeed * delta / 1000;

                const nextPlayerX = this.player.x + offsetX;
                const nextPlayerY = this.player.y + offsetY;

                // Check for collision with water at the player's next position
                if (!this.isCollidable(nextPlayerX, nextPlayerY)) {
                    this.player.x = nextPlayerX;
                    this.player.y = nextPlayerY;

                    // Update camera to follow the player
                    this.camera.centerOn(nextPlayerX, nextPlayerY);
                }
            } else {
                this.targetPosition = null;  // Stop moving
            }
        }
    }
}

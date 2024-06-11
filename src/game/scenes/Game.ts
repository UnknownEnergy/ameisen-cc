import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class Game extends Scene {
    camera: Phaser.Cameras.Scene2D.Camera;
    player: Phaser.GameObjects.Image;
    playerSpeed: number;  // Speed at which the world moves
    targetPosition: Phaser.Math.Vector2 | null; // Target position to move towards
    mapData: string[][];
    gridSize: number;
    minimap: Phaser.Cameras.Scene2D.Camera;
    minimapGraphics: Phaser.GameObjects.Graphics;

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

        // Initialize player spawn position
        let playerSpawnX = 0;
        let playerSpawnY = 0;

        // Create grid of rectangles using images
        this.mapData.forEach((row: any[], rowIndex: number) => {
            row.forEach((cell, colIndex) => {
                const x = colIndex * this.gridSize;
                const y = rowIndex * this.gridSize;
                let texture = '';

                if (cell === '0') {
                    texture = 'water';
                } else if (cell === '1') {
                    texture = 'grass';
                } else if (cell === '2') {
                    texture = 'tree';
                } else {
                    texture = 'grass';
                }

                if (texture) {
                    this.add.image(x + this.gridSize / 2, y + this.gridSize / 2, texture).setDisplaySize(this.gridSize, this.gridSize);
                }

                // Check if the cell is '3' (player spawn position)
                if (cell === '3') {
                    playerSpawnX = x + this.gridSize / 2;
                    playerSpawnY = y + this.gridSize / 2;
                }

                // Handle tree spanning two blocks
                if (cell === '2') {
                    this.add.image(x + this.gridSize / 2, y + this.gridSize / 2 + this.gridSize, 'tree').setDisplaySize(this.gridSize, this.gridSize);
                }
            });
        });

        // Add the player image at the spawn position
        this.player = this.add.image(playerSpawnX, playerSpawnY, 'gast')
            .setDisplaySize(this.gridSize, this.gridSize)
            .setDepth(1)  // Ensure the player is above other tiles
            .setOrigin(0.5, 1);

        // Center the camera on the player initially
        this.camera.centerOn(playerSpawnX, playerSpawnY);

        // Add input listener for mouse click or touch
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.targetPosition = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
        });

        // Create the minimap
        this.createMinimap();

        EventBus.emit('current-scene-ready', this);
    }

    createMinimap() {
        const minimapWidth = 200;  // Width of the minimap
        const minimapHeight = 200; // Height of the minimap

        // Create a new camera for the minimap
        this.minimap = this.cameras.add(10, 10, minimapWidth, minimapHeight).setZoom(0.1).setBackgroundColor(0x222222);
        this.minimap.scrollX = this.player.x - minimapWidth / 2;
        this.minimap.scrollY = this.player.y - minimapHeight / 2;

        // Create a graphics object to draw the player's position on the minimap
        this.minimapGraphics = this.add.graphics();
        this.minimap.ignore(this.minimapGraphics);  // Ignore the graphics in the main camera
    }

    isCollidable(x: number, y: number): boolean {
        const col = Math.floor(x / this.gridSize);
        const row = Math.floor(y / this.gridSize);

        if (row >= 0 && row < this.mapData.length && col >= 0 && col < this.mapData[row].length) {
            const cell = this.mapData[row][col];
            return cell === '0' || cell === '2'; // '0' indicates a water tile, '2' indicates a tree tile
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

                // Check for collision with water or tree at the player's next position
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

        // Update the minimap graphics to show the player's position
        this.updateMinimap();
    }

    updateMinimap() {
        this.minimapGraphics.clear();
        // Center the minimap camera on the player
        this.minimap.centerOn(this.player.x, this.player.y);
    }
}

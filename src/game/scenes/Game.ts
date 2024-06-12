import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class Game extends Scene {
    camera: Phaser.Cameras.Scene2D.Camera;
    minimapCamera: Phaser.Cameras.Scene2D.Camera;
    player: Phaser.Physics.Arcade.Image;  // Changed type to Phaser.Physics.Arcade.Image
    playerSpeed: number;  // Speed at which the world moves
    targetPosition: Phaser.Math.Vector2 | null; // Target position to move towards
    gridSize: number;
    cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    groundLayer: Phaser.Tilemaps.TilemapLayer;
    waterLayer: Phaser.Tilemaps.TilemapLayer;
    treeLayer: Phaser.Tilemaps.TilemapLayer;

    constructor() {
        super('Game');
        this.playerSpeed = 900;  // Set player speed (adjust as necessary)
        this.targetPosition = null; // Initially, no target position
        this.gridSize = 64; // Size of each grid cell
    }

    create() {
        this.camera = this.cameras.main;

        // Create the tilemap from the loaded JSON file
        const map = this.make.tilemap({ key: 'map' });

        // Add the tileset image to the map
        const tileset = map.addTilesetImage('tileset', 'tiles', 64, 64, 0, 0);

        // Create layers from the map
        // @ts-ignore
        this.groundLayer = map.createLayer('ground', tileset, 0, 0);
        // @ts-ignore
        this.waterLayer = map.createLayer('water', tileset, 0, 0);
        // Set collision for all tiles in the waterLayer
        this.waterLayer.setCollisionByExclusion([-1]);
        // @ts-ignore
        this.treeLayer = map.createLayer('tree', tileset, 0, 0);
        // Set collision for all tiles in the treeLayer
        this.treeLayer.setCollisionByExclusion([-1]);

        // Add the player image at the spawn position and enable physics
        this.player = this.physics.add.image(this.gridSize * 150, this.gridSize * 140, 'gast')
            .setDisplaySize(this.gridSize, this.gridSize)
            .setOrigin(0.5, 0.5);  // Ensure the player is centered

        // Add collision between player and treeLayer
        this.physics.add.collider(this.player, this.treeLayer);
        // Add collision between player and waterLayer
        this.physics.add.collider(this.player, this.waterLayer);

        // Add input listener for mouse click or touch
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.targetPosition = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
        });
        // Optional: Add keyboard input for debugging
        // @ts-ignore
        this.cursors = this.input.keyboard.createCursorKeys();

        // Make the camera follow the player instantly
        this.camera.startFollow(this.player);
        // Round camera position to avoid sub-pixel rendering
        this.cameras.main.roundPixels = true;

        // Create a minimap camera
        this.minimapCamera = this.cameras.add(10, 10, 200, 200).setZoom(0.05).setName('mini');
        this.minimapCamera.startFollow(this.player);
        // Round camera position to avoid sub-pixel rendering
        // @ts-ignore
        this.cameras.getCamera('mini').roundPixels = true;

        EventBus.emit('current-scene-ready', this);
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

                // Move the player using physics to handle collisions
                this.physics.moveTo(this.player, nextPlayerX, nextPlayerY, this.playerSpeed);
            } else {
                this.targetPosition = null;  // Stop moving
                // @ts-ignore
                this.player.body.setVelocity(0);  // Stop the player
            }
        }

        // Sync the minimap camera with the main camera
        this.minimapCamera.scrollX = this.camera.scrollX;
        this.minimapCamera.scrollY = this.camera.scrollY;
    }
}

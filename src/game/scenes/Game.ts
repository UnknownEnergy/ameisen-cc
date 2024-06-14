import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { SpeechBubble } from '../SpeechBubble';
import { PlayerCommands } from "../PlayerCommands";
import axios from "axios";

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
    speechBubble: SpeechBubble;
    typedText: string = '';
    playerCommands: PlayerCommands;
    private chests: Phaser.Physics.Arcade.Group;
    private items: Phaser.Physics.Arcade.Group;
    private otherPlayers: { [key: string]: { sprite: Phaser.Physics.Arcade.Image, speechBubble: SpeechBubble } } = {};
    private playerId: string;
    private readonly SERVER_URI = 'https://grazer.duckdns.org:3000';

    constructor() {
        super('Game');
        this.playerSpeed = 900;  // Set player speed (adjust as necessary)
        this.targetPosition = null; // Initially, no target position
        this.gridSize = 64; // Size of each grid cell
        this.playerId = this.generateRandomPlayerID();
    }

    create() {
        this.camera = this.cameras.main;

        // Create the tilemap from the loaded JSON file
        const map = this.make.tilemap({ key: 'map' });

        // Add the tileset image to the map
        const tileset = map.addTilesetImage('tileset', 'blocks', 64, 64, 0, 0);

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

        // Create a group to hold all chests
        this.chests = this.physics.add.group({
            immovable: true,
            allowGravity: false
        });

        // Create a group to hold all items
        this.items = this.physics.add.group({
            immovable: true,
            allowGravity: false
        });

        // Function to generate random positions
        const getRandomPosition = (min: number, max: number) => {
            return Math.floor(Math.random() * (max - min + 1) + min) * this.gridSize;
        };

        // Number of chests to spawn
        const numberOfChests = 50;

        for (let i = 0; i < numberOfChests; i++) {
            const x = getRandomPosition(0, 400);
            const y = getRandomPosition(0, 165);

            let chest = this.chests.create(x, y, 'chest', 0);
            chest.setImmovable(true);
            chest.setInteractive(); // Allow it to be interactive for click events
        }

        // Add the player image at the spawn position and enable physics
        this.player = this.physics.add.sprite(this.gridSize * 150, this.gridSize * 140, 'player', 0)
            .setOrigin(0.5, 1);  // Set the origin to bottom center

        this.physics.add.collider(this.player, this.chests);

        // Adjust the player's physics body offset and size.
        // @ts-ignore
        this.player.body.setSize(this.player.width / 2, 20);  // Set the size of the collider
        // @ts-ignore
        this.player.body.setOffset(this.player.width / 4, this.player.height - 20);  // Adjust the offset to align the collider to the bottom

        // Add collision between player and treeLayer
        this.physics.add.collider(this.player, this.treeLayer);
        // Add collision between player and waterLayer
        this.physics.add.collider(this.player, this.waterLayer);

        // Add input listener for mouse click or touch
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.targetPosition = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
        });

        // Add click event listener for chests
        this.input.on('gameobjectdown', (pointer: any, gameObject: {
            frame: any;
            texture: { key: string; }; setFrame: (arg0: number) => void; x: number; y: number }) => {
            if (gameObject.texture.key === 'chest' && gameObject.frame.name !== 1) {
                gameObject.setFrame(1); // Change the frame to 1
                this.spawnItems(gameObject.x, gameObject.y); // Spawn items next to the chest
            }
        });

        // Add touch event listener for long press or touch
        this.input.on('pointerdown', this.onPointerDown, this);
        this.input.on('pointerup', this.onPointerUp, this);
        this.input.on('pointermove', this.onPointerMove, this);

        // Create an HTML input element (hidden initially)
        this.createInputField();

        // Optional: Add keyboard input for debugging
        // @ts-ignore
        this.cursors = this.input.keyboard.createCursorKeys();

        // Create the speech bubble
        this.speechBubble = new SpeechBubble(this, this.player.x, this.player.y - 100);

        // Add keyboard input for typing text
        // @ts-ignore
        this.input.keyboard.on('keydown', this.handleTyping, this);
        this.playerCommands = new PlayerCommands(this.player, this.speechBubble);

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
            this.handlePlayerMovement(delta);
        }

        // Sync the minimap camera with the main camera
        this.minimapCamera.scrollX = this.camera.scrollX;
        this.minimapCamera.scrollY = this.camera.scrollY;

        // Update speech bubble position to follow the player
        this.speechBubble.setPosition(this.player.x, this.player.y - 100);

        // Send the player data to the server
        this.sendPlayerData(this.playerId, this.player.x, this.player.y, this.player.frame.name, this.speechBubble.text.text);

        // Fetch and render other players
        this.fetchAndRenderPlayers();
    }

    private handlePlayerMovement(delta: number) {
        // @ts-ignore
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

    private spawnItems(chestX: number, chestY: number) {
        const itemFrames = [0, 1, 2]; // Item frames
        const itemPositions = [
            { x: chestX + this.gridSize, y: chestY }, // Right of chest
            { x: chestX - this.gridSize, y: chestY }, // Left of chest
            { x: chestX, y: chestY + this.gridSize }, // Below chest
            { x: chestX, y: chestY - this.gridSize }, // Above chest
            { x: chestX + this.gridSize, y: chestY + this.gridSize }, // Bottom right diagonal
            { x: chestX - this.gridSize, y: chestY - this.gridSize }  // Top left diagonal
        ];

        // Shuffle item frames and positions
        Phaser.Utils.Array.Shuffle(itemFrames);
        Phaser.Utils.Array.Shuffle(itemPositions);

        // Spawn 3 items
        for (let i = 0; i < Phaser.Math.Between(1, 6); i++) {
            // Select a random frame from the itemFrames array
            const randomFrameIndex = Phaser.Math.Between(0, itemFrames.length - 1);
            const itemFrame = itemFrames[randomFrameIndex];

            // Create the item at the shuffled position with the selected frame
            const item = this.items.create(itemPositions[i].x, itemPositions[i].y, 'items', itemFrame);
            item.setImmovable(true);
        }

    }

    async fetchAndRenderPlayers() {
        try {
            const response = await axios.get(this.SERVER_URI + '/players');
            const players = response.data;

            players.forEach((player: { player_id: string; x: number; y: number; skin: string; chat: string}) => {
                if (player.player_id !== this.playerId) {
                    let otherPlayer = this.otherPlayers[player.player_id];
                    if (!otherPlayer) {
                        const sprite = this.physics.add.sprite(player.x, player.y, 'player', player.skin)
                            .setOrigin(0.5, 1);  // Set the origin to bottom center
                        const speechBubble = new SpeechBubble(this, player.x, player.y - 100);
                        speechBubble.setText(player.chat);
                        speechBubble.show();

                        this.otherPlayers[player.player_id] = { sprite, speechBubble };
                    } else {
                        otherPlayer.sprite.setPosition(player.x, player.y);
                        otherPlayer.sprite.setFrame(player.skin);
                        otherPlayer.speechBubble.setPosition(player.x, player.y - 100);
                        otherPlayer.speechBubble.setText(player.chat);
                        if(player.chat) {
                            otherPlayer.speechBubble.show();
                        } else {
                            otherPlayer.speechBubble.hide();
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching players data:', error);
        }
    }

    async sendPlayerData(playerId: string, x: number, y: number, skin: string, chat: String) {
        try {
            await axios.post(this.SERVER_URI + '/player', { playerId, x, y, skin, chat });
        } catch (error) {
            console.error('Error sending player data:', error);
        }
    }

    handleTyping(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            // Change bubble color to white and start timer to hide it
            this.speechBubble.setText(this.typedText, 0xffffff);
            this.playerCommands.executeCommand(this.typedText);
            this.speechBubble.startTypingTimer();
            this.typedText = '';  // Clear typed text
        } else if (event.key === 'Backspace') {
            // Remove last character
            this.typedText = this.typedText.slice(0, -1);
            this.speechBubble.setText(this.typedText);
        } else if (event.key.length === 1) {
            // Append character to text
            this.typedText += event.key;
            this.speechBubble.setText(this.typedText);
            this.speechBubble.show();
        }
    }

    private pointerDownTime: number = 0;
    private longPressDuration: number = 500;

    private onPointerDown(pointer: Phaser.Input.Pointer) {
        this.pointerDownTime = this.time.now;
    }

    private onPointerUp(pointer: Phaser.Input.Pointer) {
        const duration = this.time.now - this.pointerDownTime;
        if (duration >= this.longPressDuration) {
            this.showInputField(pointer.worldX, pointer.worldY);
        }
        this.pointerDownTime = 0;
    }

    private onPointerMove(pointer: Phaser.Input.Pointer) {
        if (this.pointerDownTime > 0) {
            const duration = this.time.now - this.pointerDownTime;
            if (duration >= this.longPressDuration) {
                this.showInputField(pointer.worldX, pointer.worldY);
                this.pointerDownTime = 0;
            }
        }
    }

    private inputField: HTMLInputElement;

    private createInputField() {
        this.inputField = document.createElement('input');
        this.inputField.type = 'text';
        this.inputField.style.position = 'absolute';
        this.inputField.style.top = '-100px';  // Hide it initially
        this.inputField.style.left = '-100px';
        this.inputField.style.opacity = '0';
        document.body.appendChild(this.inputField);

        // Add event listener to handle input
        this.inputField.addEventListener('input', (event) => {
            this.typedText = this.inputField.value;
            this.speechBubble.setText(this.typedText);
            this.speechBubble.show();
        });

        // Add event listener to handle 'Enter' key
        this.inputField.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                this.speechBubble.setText(this.typedText, 0xffffff);
                this.playerCommands.executeCommand(this.typedText);
                this.speechBubble.startTypingTimer();
                this.inputField.value = '';
                this.hideInputField();
            } else if (event.key === 'Backspace') {
                // Sync backspace with speech bubble text
                this.typedText = this.typedText.slice(0, -1);
                this.speechBubble.setText(this.typedText);
            }
        });
    }

    private showInputField(x: number, y: number) {
        const rect = this.game.canvas.getBoundingClientRect();
        this.inputField.style.top = `${rect.top + y}px`;
        this.inputField.style.left = `${rect.left + x}px`;
        this.inputField.style.opacity = '1';
        this.inputField.focus();
    }

    private hideInputField() {
        this.inputField.style.top = '-100px';
        this.inputField.style.left = '-100px';
        this.inputField.style.opacity = '0';
        this.inputField.blur();
    }

    generateRandomPlayerID() {
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 1000000); // Generate a number between 0 and 999999
        return `player_${timestamp}_${randomNum}`;
    }
}

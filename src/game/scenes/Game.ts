import {EventBus} from '../EventBus';
import {Scene} from 'phaser';
import {SpeechBubble} from '../SpeechBubble';
import {PlayerCommands} from "../PlayerCommands";
import axios from "axios";
import {environment} from '../../environments/environment';

export class Game extends Scene {
    camera: Phaser.Cameras.Scene2D.Camera;
    minimapCamera: Phaser.Cameras.Scene2D.Camera;
    player: Phaser.Physics.Arcade.Image;
    private playerNameText: Phaser.GameObjects.Text;
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
    private otherPlayers: {
        [key: string]: {
            sprite: Phaser.Physics.Arcade.Image,
            speechBubble: SpeechBubble,
            playerNameText: Phaser.GameObjects.Text
        }
    } = {};
    private readonly SERVER_URI = environment.apiUrl;
    private delay = 500;
    private delay2 = 3000;
    private lastFetchTime = 0;
    private lastFetchTime2 = 0;

    constructor() {
        super('Game');
        this.playerSpeed = 900;  // Set player speed (adjust as necessary)
        this.targetPosition = null; // Initially, no target position
        this.gridSize = 64; // Size of each grid cell
    }

    async preload() {
        await this.initializePlayersPosition();
    }

    private async initializePlayersPosition() {
        try {
            const response = await axios.get(this.SERVER_URI + '/players', {
                headers: {
                    // @ts-ignore
                    Authorization: `Bearer ${(window).authToken}`
                }
            });
            const players = response.data;
            players.forEach((player: { player_id: any; x: number; y: number; skin: string | number | Phaser.Textures.Frame; }) => {
                // @ts-ignore
                if (player.player_id === window.email) {
                    // If own player, initialize last position
                    this.player.x = player.x;
                    this.player.y = player.y;
                    this.player.setFrame(player.skin);
                }
            });
        } catch (error) {
            console.error('Error fetching players data:', error);
        }
    }

    private async fetchChestsData() {
        try {
            const response = await axios.get(this.SERVER_URI + '/chests', {
                headers: {
                    // @ts-ignore
                    Authorization: `Bearer ${(window.authToken)}`
                }
            });

            const chests = response.data;
            this.renderChests(chests);
        } catch (error) {
            console.error('Failed to fetch chests data', error);
        }
    }

    renderChests(chests: any[]) {
        chests.forEach(chestData => {
            const chest = this.chests.create(chestData.x, chestData.y, 'chest', 0);
            chest.setData('id', chestData.id);
            chest.setImmovable(true);
            chest.setInteractive();

            if (chestData.is_open) {
                chest.setFrame(1);
            }
        });
    }

    private async fetchItemsData() {
        try {
            const response = await axios.get(this.SERVER_URI + '/items', {
                headers: {
                    // @ts-ignore
                    Authorization: `Bearer ${(window.authToken)}`
                }
            });

            const items = response.data;
            this.renderItems(items);
        } catch (error) {
            console.error('Failed to fetch chests data', error);
        }
    }

    private itemMap: Map<any, { item: Phaser.Physics.Arcade.Sprite, text: Phaser.GameObjects.Text }> = new Map();

    renderItems(items: any[]) {
        items.forEach((itemData: any) => {
            if (this.itemMap.has(itemData.id)) {
                // Update the existing item and text
                const {item, text} = this.itemMap.get(itemData.id)!;
                item.setPosition(itemData.x, itemData.y);
                text.setPosition(itemData.x, itemData.y - 30).setText('Item of\n' + (window as any).email);
            } else {
                // Create new item and text
                const item = this.items.create(itemData.x, itemData.y, 'items', itemData.frame);
                item.setData('id', itemData.id);
                item.setImmovable(true);

                const text = this.add.text(itemData.x, itemData.y - 30, 'Item of\n' + (window as any).email, {
                    fontSize: '10px',
                    align: 'center'
                }).setOrigin(0.5);

                // Store the new item and text in the map
                this.itemMap.set(itemData.id, {item, text});
            }
        });
    }

    create() {
        this.camera = this.cameras.main;

        // Create the tilemap from the loaded JSON file
        const map = this.make.tilemap({key: 'map'});

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

        // Add the player image at the spawn position and enable physics
        this.player = this.physics.add.sprite(this.gridSize * 150, this.gridSize * 140, 'player', 0)
            .setOrigin(0.5, 1);  // Set the origin to bottom center

        // Create text object for the player name
        this.playerNameText = this.add.text(this.player.x, this.player.y - 120, (window as any).email, {
            fontSize: '16px',
        }).setOrigin(0.5);

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
        this.input.on('gameobjectdown', (pointer: any, gameObject: any) => {
            if (gameObject.texture.key === 'chest' && gameObject.frame.name !== 1) {
                // @ts-ignore
                const chestId = gameObject.getData('id');
                gameObject.setFrame(1); // Change the frame to 1
                axios.put(this.SERVER_URI + '/chests/' + chestId + '/open', {}, {
                    headers: {
                        Authorization: `Bearer ${(window as any).authToken}`
                    }
                });
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

        // Update player name text position
        this.playerNameText.setPosition(this.player.x, this.player.y - 105);

        // Update speech bubble position to follow the player
        this.speechBubble.setPosition(this.player.x, this.player.y - 120);

        const currentTime = Date.now();
        // Check if the delay time has passed since the last fetch
        if (currentTime - this.lastFetchTime >= this.delay) {
            this.sendPlayerData(this.player.x, this.player.y, this.player.frame.name, this.speechBubble.text.text);
            // Fetch and render other players
            this.fetchAndRenderPlayers();
            // Send the player data to the server
            this.lastFetchTime = currentTime; // Update the last fetch time
        }

        if (currentTime - this.lastFetchTime2 >= this.delay2) {
            this.fetchChestsData();
            this.fetchItemsData();
            this.lastFetchTime2 = currentTime; // Update the last fetch time
        }
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

    async fetchAndRenderPlayers() {
        try {
            const response = await axios.get(this.SERVER_URI + '/players', {
                headers: {
                    Authorization: `Bearer ${(window as any).authToken}`
                }
            });
            const players = response.data;

            players.forEach((player: { player_id: string; x: number; y: number; skin: string; chat: string }) => {
                if (player.player_id !== (window as any).email) {
                    let otherPlayer = this.otherPlayers[player.player_id];
                    if (!otherPlayer) {
                        const sprite = this.physics.add.sprite(player.x, player.y, 'player', player.skin)
                            .setOrigin(0.5, 1);  // Set the origin to bottom center
                        const speechBubble = new SpeechBubble(this, player.x, player.y - 120);
                        speechBubble.setText(player.chat);
                        speechBubble.show();

                        // Create text object for other player name
                        const playerNameText = this.add.text(player.x, player.y - 105, player.player_id, {
                            fontSize: '16px'
                        }).setOrigin(0.5);

                        this.otherPlayers[player.player_id] = {sprite, speechBubble, playerNameText};
                    } else {
                        otherPlayer.sprite.setPosition(player.x, player.y);
                        otherPlayer.sprite.setFrame(player.skin);
                        otherPlayer.speechBubble.setPosition(player.x, player.y - 120);
                        otherPlayer.speechBubble.setText(player.chat);
                        otherPlayer.playerNameText.setPosition(player.x, player.y - 105);
                        if (player.chat) {
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

    async sendPlayerData(x: number, y: number, skin: string, chat: String) {
        try {
            await axios.post(this.SERVER_URI + '/player', {x, y, skin, chat}, {
                headers: {
                    Authorization: `Bearer ${(window as any).authToken}`
                }
            });
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
        if (this.player.getBounds().contains(pointer.worldX, pointer.worldY)) {
            this.pointerDownTime = this.time.now;
        }
    }

    private onPointerUp(pointer: Phaser.Input.Pointer) {
        if (this.pointerDownTime > 0) {
            const duration = this.time.now - this.pointerDownTime;
            if (duration >= this.longPressDuration && this.player.getBounds().contains(pointer.worldX, pointer.worldY)) {
                this.showInputField();
            }
            this.pointerDownTime = 0;
        }
    }

    private onPointerMove(pointer: Phaser.Input.Pointer) {
        if (this.pointerDownTime > 0) {
            const duration = this.time.now - this.pointerDownTime;
            if (duration >= this.longPressDuration && this.player.getBounds().contains(pointer.worldX, pointer.worldY)) {
                this.showInputField();
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

    private showInputField() {
        const rect = this.game.canvas.getBoundingClientRect();
        const gameWidth = this.game.scale.width;
        const gameHeight = this.game.scale.height;

        const inputFieldWidth = this.inputField.offsetWidth;
        const inputFieldHeight = this.inputField.offsetHeight;

        const x = rect.left + (gameWidth - inputFieldWidth) / 2;
        const y = rect.top + (gameHeight - inputFieldHeight) / 2;
        this.inputField.style.top = `${y}px`;
        this.inputField.style.left = `${x}px`;
        this.inputField.style.opacity = '1';
        this.inputField.focus();
    }

    private hideInputField() {
        this.inputField.style.opacity = '0';
        this.inputField.blur();
        // @ts-ignore
        document.body.style.zoom = (window.innerWidth / window.outerWidth);
        this.game.canvas.focus();
    }
}

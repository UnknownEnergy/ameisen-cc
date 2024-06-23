import {EventBus} from '../EventBus';
import {Scene} from 'phaser';
import {PlayerCommands} from "../PlayerCommands";
import axios from "axios";
import {environment} from '../../environments/environment';
import {InventoryManager} from "../InventoryManager";
import {Player} from "../Player";

export class Game extends Scene {
    private player: Player;
    private inventoryManager: InventoryManager;
    private chests: Phaser.Physics.Arcade.Group;
    private items: Phaser.Physics.Arcade.Group;
    private itemMap: Map<string, { item: Phaser.Physics.Arcade.Sprite, text: Phaser.GameObjects.Text }> = new Map();
    private otherPlayers: { [key: string]: Player } = {};
    private readonly SERVER_URI = environment.apiUrl;
    private targetPosition: Phaser.Math.Vector2 | null = null;
    private playerSpeed = 900;
    private gridSize = 64;
    private typedText = '';
    private inputField: HTMLInputElement;

    private groundLayer?: Phaser.Tilemaps.TilemapLayer;
    private waterLayer?: Phaser.Tilemaps.TilemapLayer;
    private treeLayer?: Phaser.Tilemaps.TilemapLayer;

    private isDraggingItem: boolean = false;
    private playerMoney: number = 0;

    constructor() {
        super('Game');
    }

    async create() {
        this.createMap();
        this.initializePlayer()
        EventBus.emit('current-scene-ready', this);
    }

    createMap() {
        const map = this.make.tilemap({key: 'map'});
        const tileset = map.addTilesetImage('tileset', 'blocks', 64, 64, 0, 0);

        if (!tileset) {
            console.error('Failed to load tileset');
            return;
        }

        // Create layers
        const groundLayer = map.createLayer('ground', tileset, 0, 0);
        const waterLayer = map.createLayer('water', tileset, 0, 0);
        const treeLayer = map.createLayer('tree', tileset, 0, 0);

        if (!groundLayer || !waterLayer || !treeLayer) {
            console.error('Failed to create one or more layers');
            return;
        }

        // Set collision for water and tree layers
        waterLayer.setCollisionByExclusion([-1]);
        treeLayer.setCollisionByExclusion([-1]);

        // Store references to layers if needed later
        this.groundLayer = groundLayer;
        this.waterLayer = waterLayer;
        this.treeLayer = treeLayer;
    }

    async fetchInitialPlayerData(): Promise<{ x: number; y: number; skin: string }> {
        try {
            const response = await axios.get(`${this.SERVER_URI}/players`, {
                headers: {Authorization: `Bearer ${(window as any).authToken}`}
            });
            const players = response.data;
            const playerData = players.find((p: any) => p.player_id === (window as any).email);
            if (playerData) {
                return {x: playerData.x, y: playerData.y, skin: playerData.skin};
            }
        } catch (error) {
            console.error('Error fetching initial player data:', error);
        }
        // Return default values if fetch fails
        return {x: this.gridSize * 150, y: this.gridSize * 140, skin: '0'};
    }

    initializePlayer() {
        this.fetchInitialPlayerData().then(({x, y, skin}) => {
            this.player = new Player(this, x, y, 'player', skin);

            // Add colliders
            if (this.waterLayer) {
                this.physics.add.collider(this.player.sprite, this.waterLayer);
            }
            if (this.treeLayer) {
                this.physics.add.collider(this.player.sprite, this.treeLayer);
            }
            if (this.chests) {
                this.physics.add.collider(this.player.sprite, this.chests);
            }

            // Once the player is created, set up the camera to follow
            this.setupCamera();

            // Emit an event or call a method to indicate player is ready
            this.onPlayerReady();
        }).catch(error => {
            console.error('Error creating player:', error);
            // Create a player with default values
            this.player = new Player(this, this.gridSize * 150, this.gridSize * 140, 'player', '0');
            this.setupCamera();
            this.onPlayerReady();
        });
    }

    setupCamera() {
        const scaleFactor = (this.game as any).scaleFactor;
        this.cameras.main.startFollow(this.player.sprite).setZoom(scaleFactor);

        const {width, height} = this.scale;
        const minimapWidth = width * 0.2;
        const minimapHeight = height * 0.2;
        this.cameras.add(10, 10, minimapWidth, minimapHeight)
            .setZoom(0.05 * scaleFactor)
            .setName('mini')
            .startFollow(this.player.sprite);
    }

    onPlayerReady() {
        this.createChests();
        this.createInventory();
        this.createItems();
        this.createInputListeners();
        this.createNetworkListeners();
    }

    createChests() {
        this.chests = this.physics.add.group({immovable: true, allowGravity: false});
    }

    createItems() {
        this.items = this.physics.add.group({immovable: true, allowGravity: false});
    }

    createInventory() {
        this.inventoryManager = new InventoryManager(this, this.gridSize, this.player);
    }

    createInputListeners() {
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (!this.isDraggingItem || this.inventoryManager?.isOpen) {
                this.targetPosition = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
            }
        });

        this.input.on('gameobjectdown', (pointer: any, gameObject: any) => {
            if (gameObject.texture?.key === 'chest' && gameObject.frame.name !== 1) {
                const chestId = gameObject.getData('id');
                gameObject.setFrame(1);
                this.openChest(chestId);
            }
        });

        // @ts-ignore
        this.input.keyboard.on('keydown', this.handleKeyDown, this);

        this.input.on('pointerdown', this.onPointerDown, this);
        this.input.on('pointerup', this.onPointerUp, this);
        this.input.on('pointermove', this.onPointerMove, this);

        this.createInputField();
    }

    private handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            this.player.speechBubble.setText(this.typedText, 0xffffff);
            new PlayerCommands(this.player.sprite, this.player.speechBubble).executeCommand(this.typedText);
            this.typedText = '';
        } else if (event.key === 'Backspace') {
            this.typedText = this.typedText.slice(0, -1);
            this.player.speechBubble.setText(this.typedText);
        } else if (event.key.length === 1) {
            this.typedText += event.key;
            this.player.speechBubble.setText(this.typedText);
            this.player.speechBubble.show();
        }
    }

    private pointerDownTime: number = 0;
    private longPressDuration: number = 500;

    private onPointerDown(pointer: Phaser.Input.Pointer) {
        if (this.player.sprite.getBounds().contains(pointer.worldX, pointer.worldY)) {
            this.pointerDownTime = this.time.now;
        }
    }

    private onPointerUp(pointer: Phaser.Input.Pointer) {
        if (this.pointerDownTime > 0) {
            const duration = this.time.now - this.pointerDownTime;
            if (duration >= this.longPressDuration && this.player.sprite.getBounds().contains(pointer.worldX, pointer.worldY)) {
                this.showInputField();
            }
            this.pointerDownTime = 0;
        }
    }

    private onPointerMove(pointer: Phaser.Input.Pointer) {
        if (this.pointerDownTime > 0) {
            const duration = this.time.now - this.pointerDownTime;
            if (duration >= this.longPressDuration && this.player.sprite.getBounds().contains(pointer.worldX, pointer.worldY)) {
                this.showInputField();
                this.pointerDownTime = 0;
            }
        }
    }

    createNetworkListeners() {
        this.time.addEvent({
            delay: 500,
            callback: () => {
                this.sendPlayerData();
                this.fetchAndRenderPlayers();
            },
            callbackScope: this,
            loop: true
        });

        this.time.addEvent({
            delay: 3000,
            callback: () => {
                this.fetchChestsData();
                this.fetchItemsData();
            },
            callbackScope: this,
            loop: true
        });
    }

    override update(time: number, delta: number) {
        this.handlePlayerMovement(delta);
        this.player?.update();
        this.updateOtherPlayers();
        this.updateInventoryPosition();
    }

    updateInventoryPosition() {
        if (this.inventoryManager && this.player) {
            this.inventoryManager.updatePosition(this.player.sprite.x, this.player.sprite.y);
        }
    }

    handlePlayerMovement(delta: number) {
        if (this.isDraggingItem || this.inventoryManager?.isOpen) {
            // If dragging an item, don't move the player
            return;
        }

        if (this.targetPosition) {
            const direction = this.targetPosition.clone().subtract(new Phaser.Math.Vector2(this.player.sprite.x, this.player.sprite.y));
            const distance = direction.length();

            if (distance > this.playerSpeed * delta / 1000) {
                direction.normalize();
                const nextPlayerX = this.player.sprite.x + direction.x * this.playerSpeed * delta / 1000;
                const nextPlayerY = this.player.sprite.y + direction.y * this.playerSpeed * delta / 1000;
                this.physics.moveTo(this.player.sprite, nextPlayerX, nextPlayerY, this.playerSpeed);
            } else {
                this.targetPosition = null;
                // @ts-ignore
                this.player.sprite.body.setVelocity(0);
            }
        }
    }

    updateOtherPlayers() {
        Object.values(this.otherPlayers).forEach(player => player.update());
    }

    async fetchAndRenderPlayers() {
        try {
            const response = await axios.get(`${this.SERVER_URI}/players`, {
                headers: {Authorization: `Bearer ${(window as any).authToken}`}
            });
            const players = response.data;

            players.forEach((playerData: {
                player_id: string;
                x: number;
                y: number;
                skin: string;
                chat: string;
                money: number
            }) => {
                if (playerData.player_id === (window as any).email) {
                    // Update the current player's money
                    this.updatePlayerMoney(playerData.money);
                } else {
                    // Handle other players as before
                    let otherPlayer = this.otherPlayers[playerData.player_id];
                    if (!otherPlayer) {
                        otherPlayer = new Player(this, playerData.x, playerData.y, 'player', playerData.skin);
                        otherPlayer.nameText.setText(playerData.player_id);
                        this.otherPlayers[playerData.player_id] = otherPlayer;
                    } else {
                        otherPlayer.sprite.setPosition(playerData.x, playerData.y);
                        otherPlayer.sprite.setFrame(playerData.skin);
                    }
                    otherPlayer.speechBubble.setText(playerData.chat);
                    playerData.chat ? otherPlayer.speechBubble.show() : otherPlayer.speechBubble.hide();
                }
            });
        } catch (error) {
            console.error('Error fetching players data:', error);
        }
    }

    updatePlayerMoney(newBalance: number) {
        this.playerMoney = newBalance;
        this.inventoryManager?.updateMoneyDisplay(this.playerMoney);
    }

    async sellItem(itemId: string) {
        try {
            const response = await axios.post(`${this.SERVER_URI}/sell/${itemId}`, {}, {
                headers: {Authorization: `Bearer ${(window as any).authToken}`}
            });

            // Remove the item from the game
            const itemAndText = this.itemMap.get(itemId);
            if (itemAndText) {
                itemAndText.item.destroy();
                itemAndText.text.destroy();
                this.itemMap.delete(itemId);
            }

            // Fetch updated player data (including new money balance)
            await this.fetchAndRenderPlayers();

            // Optionally, show a message to the player
            this.player.speechBubble.setText(`Sold item for $${response.data.money}`, 0x00ff00);
        } catch (error) {
            console.error('Error selling item:', error);
            // Optionally, show an error message to the player
            this.player.speechBubble.setText('Error selling item', 0xff0000);
        }
    }

    async fetchChestsData() {
        try {
            const response = await axios.get(`${this.SERVER_URI}/chests`, {
                headers: {Authorization: `Bearer ${(window as any).authToken}`}
            });
            this.renderChests(response.data);
        } catch (error) {
            console.error('Failed to fetch chests data', error);
        }
    }

    renderChests(chests: any[]) {
        chests.forEach(chestData => {
            const chest = this.chests.create(chestData.x, chestData.y, 'chest', chestData.is_open ? 1 : 0);
            chest.setData('id', chestData.id).setImmovable(true).setInteractive();
        });
    }

    async fetchItemsData() {
        try {
            const response = await axios.get(`${this.SERVER_URI}/items`, {
                headers: {Authorization: `Bearer ${(window as any).authToken}`}
            });
            this.renderItems(response.data);
        } catch (error) {
            console.error('Failed to fetch items data', error);
        }
    }

    renderItems(items: any[]) {
        items.forEach(itemData => {
            if (itemData.in_inventory === 1 && (itemData.player_id !== (window as any).email)) {
                return; //skip rendering inventory items of other players
            }

            let itemAndText = this.itemMap.get(itemData.id);
            if (!itemAndText) {
                const item = this.items.create(itemData.x, itemData.y, 'items', itemData.frame) as Phaser.Physics.Arcade.Sprite;
                item.setData('id', itemData.id).setImmovable(true).setInteractive();

                const text = this.add.text(itemData.x, itemData.y - 30, `Item of\n${itemData.player_id}`, {
                    fontSize: '10px',
                    align: 'center'
                }).setOrigin(0.5);

                itemAndText = {item, text};
                this.itemMap.set(itemData.id, itemAndText);

                if (itemData.player_id === (window as any).email) {
                    this.setupItemDrag(item);
                }
            } else {
                itemAndText.item.setPosition(itemData.x, itemData.y);
                itemAndText.text.setPosition(itemData.x, itemData.y - 30).setText(`Item of\n${itemData.player_id}`);
            }

            if (itemData.in_inventory === 1) {
                itemAndText.text.text = '';
                this.inventoryManager?.addItemToFirstEmptySlot(itemAndText.item);
                itemAndText.item.setVisible(this.inventoryManager?.isOpen || false);
            } else {
                itemAndText.item.setVisible(true);
            }
        });
    }

    setupItemDrag(item: Phaser.Physics.Arcade.Sprite) {
        this.input.setDraggable(item);

        item.on('dragstart', () => {
            this.isDraggingItem = true;
            if (item.getData('inventorySlot')) {
                this.inventoryManager?.removeItemFromSlot(item);
            }
        });

        item.on('drag', (pointer: any, dragX: any, dragY: any) => {
            item.x = dragX;
            item.y = dragY;
            const text = this.itemMap.get(item.getData('id'))?.text;
            if (text) {
                text.x = dragX;
                text.y = dragY - 30;
            }
        });

        item.on('dragend', (pointer: any) => {
            this.isDraggingItem = false;
            const droppedOnInventory = this.inventoryManager?.isPointInInventory(item.x, item.y);
            const droppedOnSellArea = this.inventoryManager?.isSellArea(item.x, item.y);

            if (droppedOnSellArea && this.inventoryManager?.isOpen) {
                this.sellItem(item.getData('id'));
            } else if (droppedOnInventory && this.inventoryManager?.isOpen) {
                const addedToInventory = this.inventoryManager?.addItemToFirstEmptySlot(item);
                if (addedToInventory) {
                    this.updateItemPosition(item.getData('id'), item.x, item.y, 1);
                    const text = this.itemMap.get(item.getData('id'))?.text;
                    if (text) {
                        text.setText('');
                    }
                } else {
                    // If inventory is full, return item to the world
                    this.updateItemPosition(item.getData('id'), item.x, item.y, 0);
                    item.setVisible(true);
                }
            } else {
                // If not dropped on inventory or inventory is closed, update its position in the world
                this.updateItemPosition(item.getData('id'), item.x, item.y, 0);
                item.setData('inventorySlot', null);
                item.setVisible(true);
            }
        });
    }

    updateItemPosition(itemId: string, x: number, y: number, inInventory: number) {
        axios.put(`${this.SERVER_URI}/items/${itemId}`, {x, y, in_inventory: inInventory}, {
            headers: {Authorization: `Bearer ${(window as any).authToken}`}
        }).catch(error => console.error('Error updating item position:', error));

        const itemAndText = this.itemMap.get(itemId);
        if (itemAndText) {
            const {item, text} = itemAndText;
            if (inInventory) {
                text.setText('');
            } else {
                text.setText(`Item of\n${(window as any).email}`);
                text.setPosition(x, y - 30);
            }
        }
    }

    openChest(chestId: string) {
        axios.put(`${this.SERVER_URI}/chests/${chestId}/open`, {}, {
            headers: {Authorization: `Bearer ${(window as any).authToken}`}
        });
    }

    sendPlayerData() {
        const {x, y} = this.player.sprite;
        const skin = this.player.sprite.frame.name;
        const chat = this.player.speechBubble.text.text;
        axios.post(`${this.SERVER_URI}/player`, {x, y, skin, chat}, {
            headers: {Authorization: `Bearer ${(window as any).authToken}`}
        }).catch(error => console.error('Error sending player data:', error));
    }

    createInputField() {
        this.inputField = document.createElement('input');
        this.inputField.type = 'text';
        this.inputField.style.position = 'absolute';
        this.inputField.style.top = '-100px';
        this.inputField.style.left = '-100px';
        this.inputField.style.opacity = '0';
        this.inputField.disabled = true;  // Start as disabled
        document.body.appendChild(this.inputField);

        this.inputField.addEventListener('input', () => {
            this.typedText = this.inputField.value;
            this.player.speechBubble.setText(this.typedText);
            this.player.speechBubble.show();
        });

        this.inputField.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                this.player.speechBubble.setText(this.typedText, 0xffffff);
                new PlayerCommands(this.player.sprite, this.player.speechBubble).executeCommand(this.typedText);
                this.inputField.value = '';
                this.hideInputField();
            } else if (event.key === 'Backspace') {
                this.typedText = this.typedText.slice(0, -1);
                this.player.speechBubble.setText(this.typedText);
            }
        });
    }

    showInputField() {
        const rect = this.game.canvas.getBoundingClientRect();
        const {width, height} = this.scale;
        const inputFieldWidth = this.inputField.offsetWidth;
        const inputFieldHeight = this.inputField.offsetHeight;
        const x = rect.left + (width - inputFieldWidth) / 2;
        const y = rect.top + (height - inputFieldHeight) / 2;
        this.inputField.style.top = `${y}px`;
        this.inputField.style.left = `${x}px`;
        this.inputField.style.opacity = '1';
        this.inputField.disabled = false;
        this.inputField.focus();
    }

    hideInputField() {
        this.inputField.style.top = '-100px';
        this.inputField.style.left = '-100px';
        this.inputField.style.opacity = '0';
        this.inputField.disabled = true;
        this.inputField.blur();
    }
}

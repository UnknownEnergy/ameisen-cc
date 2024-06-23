import {EventBus} from '../EventBus';
import {Scene} from 'phaser';
import {SpeechBubble} from '../SpeechBubble';
import {PlayerCommands} from "../PlayerCommands";
import axios from "axios";
import {environment} from '../../environments/environment';

class Player {
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

class InventoryManager {
    private scene: Scene;
    private readonly gridSize: number;
    slots: { x: number; y: number; occupied: boolean; item: any }[] = [];
    private player: Player;
    isOpen: boolean = false;
    inventoryContainer: Phaser.GameObjects.Container;
    private moneyText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, gridSize: number, player: Player) {
        this.scene = scene;
        this.gridSize = gridSize;
        this.player = player;
        this.inventoryContainer = this.scene.add.container(0, 0);
        this.createGrid(player.sprite.x, player.sprite.y);
        this.createSellArea();
        this.createMoneyDisplay();
        this.close(); // Start with the inventory closed
    }

    createMoneyDisplay() {
        this.moneyText = this.scene.add.text(0, 0, '$0', { fontSize: '24px', color: '#ffffff' });
        this.moneyText.setOrigin(1, 0);
        this.inventoryContainer.add(this.moneyText);
    }

    updateMoneyDisplay(amount: number) {
        this.moneyText.setText(`$${amount}`);
    }

    createGrid(startX: number, startY: number) {
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 5; x++) {
                const slotX = startX + (x * this.gridSize);
                const slotY = startY + (y * this.gridSize);
                const slot = this.scene.add.rectangle(slotX, slotY, this.gridSize, this.gridSize, 0x0000ff);
                slot.setStrokeStyle(2, 0xffffff);
                slot.setInteractive();
                slot.setData('inventorySlot', true);
                slot.setName(`inventorySlot_${y * 5 + x}`);

                this.inventoryContainer.add(slot);
                this.slots.push({x: slotX, y: slotY, occupied: false, item: null});
            }
        }
    }

    isPointInInventory(x: number, y: number): boolean {
        const inventoryBounds = new Phaser.Geom.Rectangle(
            this.player.sprite.x,
            this.player.sprite.y,
            this.gridSize * 5,
            this.gridSize * 4
        );
        return inventoryBounds.contains(x, y);
    }

    isSellArea(x: number, y: number): boolean {
        const sellArea = this.inventoryContainer.getByName('sellArea') as Phaser.GameObjects.Rectangle;
        if (sellArea) {
            return sellArea.getBounds().contains(x, y);
        }
        return false;
    }

    addItemToFirstEmptySlot(item: Phaser.Physics.Arcade.Sprite) {
        const existingSlot = this.slots.find(slot => slot === item.getData('inventorySlot'));
        const emptySlot = existingSlot ? existingSlot : this.slots.find(slot => !slot.occupied);
        if (emptySlot) {
            item.setPosition(emptySlot.x, emptySlot.y);
            item.setImmovable(true);
            emptySlot.occupied = true;
            emptySlot.item = item;
            item.setData('inventorySlot', emptySlot);
            return true;
        }
        return false;
    }

    createSellArea() {
        const sellAreaX = this.player.sprite.x + (5 * this.gridSize) + 50;
        const sellAreaY = this.player.sprite.y;
        const sellArea = this.scene.add.rectangle(sellAreaX, sellAreaY, this.gridSize, this.gridSize, 0xff0000);
        sellArea.setInteractive().setData('sellArea', true);
        sellArea.setName('sellArea');
        this.inventoryContainer.add(sellArea);
    }

    open() {
        this.isOpen = true;
        this.inventoryContainer.setVisible(true);
        this.showInventoryItems();
        this.moneyText.setVisible(true);
    }

    close() {
        this.isOpen = false;
        this.inventoryContainer.setVisible(false);
        this.hideInventoryItems();
        this.moneyText.setVisible(false);
    }

    showInventoryItems() {
        this.slots.forEach(slot => {
            if (slot.item) {
                slot.item.setVisible(true);
            }
        });
    }

    hideInventoryItems() {
        this.slots.forEach(slot => {
            if (slot.item) {
                slot.item.setVisible(false);
            }
        });
    }

    removeItemFromSlot(item: Phaser.Physics.Arcade.Sprite) {
        const slot = this.slots.find(s => s.item === item);
        if (slot) {
            slot.occupied = false;
            slot.item = null;
            item.setData('inventorySlot', null);
        }
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    updatePosition(playerX: number, playerY: number) {
        this.inventoryContainer.setPosition(playerX, playerY);
        this.moneyText.setPosition(4 * this.gridSize, -70);
        this.slots.forEach((slot, index) => {
            const x = (index % 5) * this.gridSize;
            const y = Math.floor(index / 5) * this.gridSize;
            slot.x = x;
            slot.y = y;

            const rectangle = this.inventoryContainer.getByName(`inventorySlot_${index}`) as Phaser.GameObjects.Rectangle;
            if (rectangle) {
                rectangle.setPosition(x, y);
            }

            if (slot.item) {
                slot.item.setPosition(playerX + x, playerY + y);
            }
        });

        // Update sell area position
        const sellArea = this.inventoryContainer.getByName('sellArea') as Phaser.GameObjects.Rectangle;
        if (sellArea) {
            sellArea.setPosition((5 * this.gridSize) + 50, 0);
        }
    }
}

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
        this.inventoryManager.open();
        this.createItems();
        this.createInputListeners();
        this.createNetworkListeners();
        // Set the rendering order of game objects
        this.inventoryManager.inventoryContainer.setDepth(4);
        this.player.sprite.setDepth(3);
        Object.values(this.otherPlayers).forEach((player) => {
            player.sprite.setDepth(2);
        });
        this.items.setDepth(1);
        this.chests.setDepth(0);
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
            if (!this.isDraggingItem) {
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
            new PlayerCommands(this.player.sprite, this.player.speechBubble, this).executeCommand(this.typedText);
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
        if (this.isDraggingItem) {
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

            players.forEach((playerData: { player_id: string; x: number; y: number; skin: string; chat: string; money: number }) => {
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
                headers: { Authorization: `Bearer ${(window as any).authToken}` }
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
            }
            else if (droppedOnInventory && this.inventoryManager?.isOpen) {
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
                new PlayerCommands(this.player.sprite, this.player.speechBubble, this).executeCommand(this.typedText);
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

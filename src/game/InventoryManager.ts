import {Scene} from "phaser";
import {Player} from "./Player";

export class InventoryManager {
    private scene: Scene;
    private readonly gridSize: number;
    slots: { x: number; y: number; occupied: boolean; item: any }[] = [];
    private player: Player;
    isOpen: boolean = false;
    inventoryContainer: Phaser.GameObjects.Container;
    private moneyText: Phaser.GameObjects.Text;
    private toggleButton: Phaser.GameObjects.Container;

    constructor(scene: Phaser.Scene, gridSize: number, player: Player) {
        this.scene = scene;
        this.gridSize = gridSize;
        this.player = player;
        this.inventoryContainer = this.scene.add.container(0, 0);
        this.createGrid(player.sprite.x, player.sprite.y);
        this.createSellArea();
        this.createMoneyDisplay();
        this.createToggleButton();
        this.close(); // Start with the inventory closed
    }

    createMoneyDisplay() {
        this.moneyText = this.scene.add.text(0, 0, '$0', {fontSize: '24px', color: '#ffffff'});
        this.moneyText.setOrigin(1, 0);
        this.inventoryContainer.add(this.moneyText);
    }

    updateMoneyDisplay(amount: number) {
        this.moneyText.setText(`$${amount}`);
    }

    createToggleButton() {
        const buttonWidth = 60;
        const buttonHeight = 60;
        const buttonRadius = 10;

        // Create a rounded rectangle for the button background
        const background = this.scene.add.graphics();
        background.fillStyle(0x4a4a4a, 1);
        background.fillRoundedRect(0, 0, buttonWidth, buttonHeight, buttonRadius);
        background.lineStyle(2, 0xffffff, 1);
        background.strokeRoundedRect(0, 0, buttonWidth, buttonHeight, buttonRadius);

        // Create an icon for the button (you can replace this with an image if you prefer)
        const icon = this.scene.add.text(buttonWidth / 2, buttonHeight / 2, '🎒', {
            fontSize: '32px'
        }).setOrigin(0.5);

        // Create a container for the button
        this.toggleButton = this.scene.add.container(0, 0, [background, icon]);
        this.toggleButton.setSize(buttonWidth, buttonHeight);
        this.toggleButton.setInteractive(new Phaser.Geom.Rectangle(30, 30, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);

        // Add touch event listener
        // Add touch event listener
        this.toggleButton.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.toggle();
        });

        // Set the button's position relative to the player
        this.updateToggleButtonPosition();

        // Ensure the button is always on top and visible
        this.toggleButton.setDepth(1000);
        this.toggleButton.setScrollFactor(0);

        this.toggle();
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
        const camera = this.scene.cameras.main;
        const inventoryBounds = new Phaser.Geom.Rectangle(
            this.player.sprite.x - camera.width / 3,
            this.player.sprite.y + 80,
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

    updateToggleButtonPosition() {
        const camera = this.scene.cameras.main;
        const buttonX = camera.width - 80;
        const buttonY = camera.height - 80;
        this.toggleButton.setPosition(buttonX, buttonY);
    }

    updatePosition(playerX: number, playerY: number) {
        const camera = this.scene.cameras.main;
        this.inventoryContainer.setPosition(playerX - camera.width / 3, playerY + 80);
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
                slot.item.setPosition(playerX - camera.width / 3 + x, playerY + 80 + y);
            }
        });

        // Update sell area position
        const sellArea = this.inventoryContainer.getByName('sellArea') as Phaser.GameObjects.Rectangle;
        if (sellArea) {
            sellArea.setPosition((5 * this.gridSize), 0);
        }
        this.updateToggleButtonPosition();
    }
}

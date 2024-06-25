import {Scene} from "phaser";
import {Player} from "./Player";
import axios from "axios";
import {environment} from "../environments/environment";

export class InventoryManager {
    private scene: Scene;
    private player: Player;
    private gridSize: number = 64;
    private slots: InventorySlot[] = [];
    isOpen: boolean = false;
    private inventoryContainer: Phaser.GameObjects.Container;
    private skinShopContainer: Phaser.GameObjects.Container;
    private houseShopContainer: Phaser.GameObjects.Container;

    private moneyText: Phaser.GameObjects.Text;
    private toggleButton: Phaser.GameObjects.Container;
    private skinShopToggleButton: Phaser.GameObjects.Container;
    private houseShopToggleButton: Phaser.GameObjects.Container;
    private sellArea: Phaser.GameObjects.Rectangle;

    private currentSkinIndex: number = 0;
    private currentHouseIndex: number = 0;
    private skinPrices: Map<string, number> = new Map();
    private housePrices: Map<string, number> = new Map();

    private housePreview: Phaser.GameObjects.Sprite;
    private buyHouseButton: Phaser.GameObjects.Text;
    private availableHouses: string[] = ['0', '1', '2', '3'];
    private skinPreview: Phaser.GameObjects.Sprite;
    private buyButton: Phaser.GameObjects.Text;
    private availableSkins: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'];

    private readonly INVENTORY_ROWS = 4;
    private readonly INVENTORY_COLS = 5;

    constructor(scene: Scene, player: Player) {
        this.scene = scene;
        this.player = player;
        this.initializeContainers();
        this.createInventoryGrid();
        this.createButtons();
        this.createMoneyDisplay();
        this.createSellArea();
        this.createShops();
        this.fetchPrices();

        this.inventoryContainer.setVisible(false);
        this.sellArea.setVisible(false);
        this.houseShopContainer.setVisible(false);
        this.skinShopContainer.setVisible(false);
        this.moneyText.setVisible(false);
    }

    private initializeContainers(): void {
        this.inventoryContainer = this.scene.add.container(0, 0);
        this.skinShopContainer = this.scene.add.container(0, 0);
        this.houseShopContainer = this.scene.add.container(0, 0);

        this.inventoryContainer.setScrollFactor(0);
        this.skinShopContainer.setScrollFactor(0);
        this.houseShopContainer.setScrollFactor(0);
    }

    private createInventoryGrid(): void {
        const startX = this.scene.cameras.main.width / 2 - this.INVENTORY_COLS * this.gridSize / 2;
        const startY = this.scene.cameras.main.height / 2;

        for (let row = 0; row < this.INVENTORY_ROWS; row++) {
            for (let col = 0; col < this.INVENTORY_COLS; col++) {
                const x = startX + col * this.gridSize;
                const y = startY + row * this.gridSize;
                const slot = new InventorySlot(this.scene, x, y, this.gridSize);
                this.slots.push(slot);
                this.inventoryContainer.add(slot.rectangle);
            }
        }
    }

    private createButtons(): void {
        this.toggleButton = this.createButton(0xadd8e6, '🎒', this.toggle.bind(this));
        this.skinShopToggleButton = this.createButton(0xffa500, '👕', this.toggleSkinShop.bind(this));
        this.houseShopToggleButton = this.createButton(0x90ee90, '🏠', this.toggleHouseShop.bind(this));

        this.toggleButton.setPosition(this.scene.cameras.main.width, this.scene.cameras.main.height);
        this.skinShopToggleButton.setPosition(this.scene.cameras.main.width, this.scene.cameras.main.height-60);
        this.houseShopToggleButton.setPosition(this.scene.cameras.main.width, this.scene.cameras.main.height-120);

        this.toggleButton.setScrollFactor(0);
        this.skinShopToggleButton.setScrollFactor(0);
        this.houseShopToggleButton.setScrollFactor(0);
    }

    private createButton(color: number, icon: string, callback: () => void): Phaser.GameObjects.Container {
        const button = this.scene.add.container(0, 0);
        const bg = this.scene.add.rectangle(0, 0, 50, 50, color).setOrigin(0.5);
        const text = this.scene.add.text(0, 0, icon, {fontSize: '24px'}).setOrigin(0.5);
        button.add([bg, text]);
        button.setSize(50, 50);
        button.setInteractive({useHandCursor: true})
            .on('pointerdown', callback);
        return button;
    }

    private createMoneyDisplay(): void {
        this.moneyText = this.scene.add.text(this.scene.cameras.main.width / this.scene.cameras.main.zoomX / 2, 0, '$0', {
            fontSize: '24px',
            color: '#ffffff'
        });
        this.moneyText.setScrollFactor(0);
    }

    private createSellArea(): void {
        const x = this.scene.cameras.main.width / this.scene.cameras.main.zoomX / 2.5;
        const y = 0;
        this.sellArea = this.scene.add.rectangle(x, y, this.gridSize, this.gridSize, 0xff0000);
        this.sellArea.setInteractive();
        this.sellArea.setScrollFactor(0);
    }

    private createShops(): void {
        this.fetchSkinPrices();
        this.createSkinShop();
        this.fetchHousePrices();
        this.createHouseShop();
    }

    private fetchPrices(): void {
        axios.get(`${environment.apiUrl}/skin-prices`)
            .then(response => {
                response.data.forEach((item: { skin_id: string, price: number }) => {
                    this.skinPrices.set(item.skin_id, item.price);
                });
            })
            .catch(error => console.error('Error fetching skin prices:', error));

        axios.get(`${environment.apiUrl}/house-prices`)
            .then(response => {
                response.data.forEach((item: { house_id: string, price: number }) => {
                    this.housePrices.set(item.house_id, item.price);
                });
            })
            .catch(error => console.error('Error fetching house prices:', error));
    }

    public toggle(): void {
        this.isOpen = !this.isOpen;
        this.skinShopContainer.setVisible(false);
        this.houseShopContainer.setVisible(false);
        this.inventoryContainer.setVisible(this.isOpen);
        this.sellArea.setVisible(this.isOpen);
        this.moneyText.setVisible(this.isOpen);
    }

    public toggleSkinShop(): void {
        const isVisible = !this.skinShopContainer.visible;
        this.skinShopContainer.setVisible(isVisible);
        this.houseShopContainer.setVisible(false);
        this.inventoryContainer.setVisible(false);
        this.sellArea.setVisible(false);
        this.moneyText.setVisible(isVisible);
    }

    public toggleHouseShop(): void {
        const isVisible = !this.houseShopContainer.visible;
        this.houseShopContainer.setVisible(isVisible);
        this.skinShopContainer.setVisible(false);
        this.inventoryContainer.setVisible(false);
        this.sellArea.setVisible(false);
        this.moneyText.setVisible(isVisible);
    }

    public updateMoneyDisplay(amount: number): void {
        this.moneyText.setText(`$${amount}`);
    }

    public addItem(item: Phaser.GameObjects.Sprite): boolean {
        const emptySlot = this.slots.find(slot => !slot.item);
        if (emptySlot) {
            emptySlot.setItem(item);
            return true;
        }
        return false;
    }

    public removeItem(item: Phaser.GameObjects.Sprite): void {
        const slot = this.slots.find(slot => slot.item === item);
        if (slot) {
            slot.clearItem();
        }
    }

    public isPointInInventory(x: number, y: number): boolean {
        return this.slots.some(slot => slot.contains(x, y));
    }

    public isSellArea(x: number, y: number): boolean {
        return this.sellArea.getBounds().contains(x, y);
    }

    createSkinShop() {
        this.skinShopContainer = this.scene.add.container(0, 0);
        this.skinShopContainer.setScrollFactor(0);

        const background = this.scene.add.rectangle(0, 0, this.gridSize * 3, this.gridSize * 4, 0x333333);
        background.setOrigin(0);
        background.setScrollFactor(0);
        this.skinShopContainer.add(background);
        this.skinShopContainer.setPosition(this.scene.cameras.main.width / 2 - background.width / 2, this.scene.cameras.main.height / 2)

        this.skinPreview = this.scene.add.sprite(this.gridSize * 1.5, this.gridSize, 'player', this.availableSkins[0]);
        this.skinPreview.setScrollFactor(0);
        this.skinShopContainer.add(this.skinPreview);

        const nextButton = this.scene.add.text(this.gridSize * 2.5, this.gridSize, '>', {fontSize: '32px'})
            .setInteractive()
            .on('pointerdown', () => this.nextSkin());
        nextButton.setScrollFactor(0);
        this.skinShopContainer.add(nextButton);

        const prevButton = this.scene.add.text(this.gridSize * 0.5, this.gridSize, '<', {fontSize: '32px'})
            .setInteractive()
            .on('pointerdown', () => this.prevSkin());
        prevButton.setScrollFactor(0);
        this.skinShopContainer.add(prevButton);

        this.buyButton = this.scene.add.text(this.gridSize * 1.5, this.gridSize * 3, `Buy now`, {fontSize: '24px'})
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => this.buySkin());
        this.buyButton.setScrollFactor(0);
        this.skinShopContainer.add(this.buyButton);
    }

    nextSkin() {
        this.currentSkinIndex = (this.currentSkinIndex + 1) % this.availableSkins.length;
        this.updateSkinPreview();
        this.updateSkinShopDisplay();
    }

    prevSkin() {
        this.currentSkinIndex = (this.currentSkinIndex - 1 + this.availableSkins.length) % this.availableSkins.length;
        this.updateSkinPreview();
        this.updateSkinShopDisplay();
    }

    updateSkinPreview() {
        this.skinPreview.setFrame(this.availableSkins[this.currentSkinIndex]);
    }

    buySkin() {
        const selectedSkin = this.availableSkins[this.currentSkinIndex];
        axios.post(`${environment.apiUrl}/buy-skin`, {skinId: selectedSkin}, {
            headers: {Authorization: `Bearer ${(window as any).authToken}`}
        })
            .then(response => {
                if (response.data.success) {
                    this.player.sprite.setFrame(selectedSkin);
                    this.updateMoneyDisplay(response.data.newBalance);
                    this.scene.events.emit('skinPurchased', selectedSkin);
                } else {
                    console.error('Failed to buy skin:', response.data.message);
                }
            })
            .catch(error => {
                console.error('Error buying skin:', error);
            });
    }

    async fetchSkinPrices() {
        try {
            const response = await axios.get(`${environment.apiUrl}/skin-prices`, {
                headers: {Authorization: `Bearer ${(window as any).authToken}`}
            });
            response.data.forEach((item: { skin_id: string, price: number }) => {
                this.skinPrices.set(item.skin_id, item.price);
            });
            this.updateSkinShopDisplay();
        } catch (error) {
            console.error('Error fetching skin prices:', error);
        }
    }

    updateSkinShopDisplay() {
        const currentSkin = this.availableSkins[this.currentSkinIndex];
        const price = this.skinPrices.get(currentSkin) || 0;
        this.buyButton.setText(`Buy for $${price}`);
        this.skinPreview.setFrame(currentSkin);
    }

    createHouseShop() {
        this.houseShopContainer = this.scene.add.container(0, 0);
        this.houseShopContainer.setScrollFactor(0);

        const background = this.scene.add.rectangle(0, 0, this.gridSize * 4, this.gridSize * 5, 0x333333);
        background.setOrigin(0);
        background.setScrollFactor(0);
        this.houseShopContainer.add(background);
        this.houseShopContainer.setPosition(this.scene.cameras.main.width / 2 - background.width / 2, this.scene.cameras.main.height / 2)

        this.housePreview = this.scene.add.sprite(this.gridSize * 2, this.gridSize * 1.5, 'houses', this.availableHouses[0]);
        this.housePreview.setScrollFactor(0);
        this.houseShopContainer.add(this.housePreview);

        const nextButton = this.scene.add.text(this.gridSize * 3, this.gridSize * 1.5, '>', {fontSize: '32px'})
            .setInteractive()
            .on('pointerdown', () => this.nextHouse());
        nextButton.setScrollFactor(0);
        this.houseShopContainer.add(nextButton);

        const prevButton = this.scene.add.text(this.gridSize, this.gridSize * 1.5, '<', {fontSize: '32px'})
            .setInteractive()
            .on('pointerdown', () => this.prevHouse());
        prevButton.setScrollFactor(0);
        this.houseShopContainer.add(prevButton);

        this.buyHouseButton = this.scene.add.text(this.gridSize * 2, this.gridSize * 3, 'Buy House', {fontSize: '24px'})
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => this.buyHouse());
        this.buyButton.setScrollFactor(0);
        this.houseShopContainer.add(this.buyHouseButton);
    }

    nextHouse() {
        this.currentHouseIndex = (this.currentHouseIndex + 1) % this.availableHouses.length;
        this.updateHousePreview();
    }

    prevHouse() {
        this.currentHouseIndex = (this.currentHouseIndex - 1 + this.availableHouses.length) % this.availableHouses.length;
        this.updateHousePreview();
    }

    updateHousePreview() {
        this.housePreview.setFrame(this.availableHouses[this.currentHouseIndex]);
        const price = this.housePrices.get(this.availableHouses[this.currentHouseIndex]) || 0;
        this.buyHouseButton.setText(`Buy for $${price}`);
    }

    buyHouse() {
        const selectedHouse = this.availableHouses[this.currentHouseIndex];
        const price = this.housePrices.get(selectedHouse) || 0;

        axios.post(`${environment.apiUrl}/buy-house`, {houseId: selectedHouse}, {
            headers: {Authorization: `Bearer ${(window as any).authToken}`}
        })
            .then(response => {
                if (response.data.success) {
                    this.updateMoneyDisplay(response.data.newBalance);
                    this.scene.events.emit('housePurchased', selectedHouse, price);
                } else {
                    console.error('Failed to buy house:', response.data.message);
                }
            })
            .catch(error => {
                console.error('Error buying house:', error);
            });
    }

    async fetchHousePrices() {
        try {
            const response = await axios.get(`${environment.apiUrl}/house-prices`, {
                headers: {Authorization: `Bearer ${(window as any).authToken}`}
            });
            response.data.forEach((item: { house_id: string, price: number }) => {
                this.housePrices.set(item.house_id, item.price);
            });
            this.updateHousePreview();
        } catch (error) {
            console.error('Error fetching house prices:', error);
        }
    }
}

class InventorySlot {
    public rectangle: Phaser.GameObjects.Rectangle;
    public item: Phaser.GameObjects.Sprite | null = null;

    constructor(scene: Scene, x: number, y: number, size: number) {
        this.rectangle = scene.add.rectangle(x, y, size, size, 0x000000);
        this.rectangle.setStrokeStyle(2, 0xffffff);
        this.rectangle.setOrigin(0);
    }

    public setPosition(x: number, y: number): void {
        this.rectangle.setPosition(x, y);
        if (this.item) {
            this.item.setPosition(x + this.rectangle.width / 2, y + this.rectangle.height / 2);
        }
    }

    public setItem(item: Phaser.GameObjects.Sprite): void {
        this.item = item;
        item.setPosition(this.rectangle.x + this.rectangle.width / 2, this.rectangle.y + this.rectangle.height / 2);
    }

    public clearItem(): void {
        this.item = null;
    }

    public contains(x: number, y: number): boolean {
        return this.rectangle.getBounds().contains(x, y);
    }
}

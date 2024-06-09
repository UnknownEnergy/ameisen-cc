import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;

    constructor ()
    {
        super('Game');
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
        const player = this.add.image(centerX, centerY, 'gast').setDisplaySize(rectSize, rectSize);

        EventBus.emit('current-scene-ready', this);
    }



    changeScene ()
    {
        this.scene.start('GameOver');
    }
}

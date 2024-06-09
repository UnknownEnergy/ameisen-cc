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
        const rows = 100; // Number of rows
        const cols = 100; // Number of columns
        const rectSize = 50; // Width and height of each rectangle

        // Define colors for water and grass
        const colors = {
            water: 0x0000ff, // Blue for water
            grass: 0x00ff00  // Green for grass
        };

        // Create grid of rectangles
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * rectSize;
                const y = row * rectSize;
                const color = (row + col) % 2 === 0 ? colors.water : colors.grass; // Alternate between water and grass

                graphics.fillStyle(color, 1.0);
                graphics.fillRect(x, y, rectSize, rectSize);
            }
        }

        EventBus.emit('current-scene-ready', this);
    }


    changeScene ()
    {
        this.scene.start('GameOver');
    }
}

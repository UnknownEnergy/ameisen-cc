import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
    }

    preload ()
    {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');
        // Load the tileset image
        this.load.image('tiles', 'tilesets/tileset.png');
        // Load the TMX map
        this.load.tilemapTiledJSON('map', 'maps/map.json');
        this.load.image('gast', 'gast.png');
    }

    create ()
    {
        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('Game');
    }
}

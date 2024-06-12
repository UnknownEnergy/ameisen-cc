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
        this.load.setPath('assets');
        this.load.image('blocks', 'tilesets/blocks/blocks.png');
        this.load.tilemapTiledJSON('map', 'maps/map.json');
        this.load.spritesheet('player', 'spritesheets/playerspritesheet.png', {
            frameWidth: 64,
            frameHeight: 94
        });
    }

    create ()
    {
        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('Game');
    }
}

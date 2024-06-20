import {Boot} from './scenes/Boot';
import {Game as MainGame} from './scenes/Game';
import {AUTO, Game} from 'phaser';
import {Preloader} from './scenes/Preloader';


const gameWidth = isMobileDevice() ? 480 : 1280;
const gameHeight = isMobileDevice() ? 800 : 720;

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

const screenWidth = window.innerWidth;
const scaleFactor = screenWidth / gameWidth;

const scaledHeight = gameHeight * scaleFactor;

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: screenWidth,
    height: scaledHeight,
    parent: 'game-container',
    backgroundColor: '#000000',
    dom: {
        createContainer: true
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            // @ts-ignore
            gravity: {y: 0}  // Top-down game, no gravity
        }
    },
    scene: [
        Boot,
        Preloader,
        MainGame,
    ]
};

const StartGame = (parent: string) => {
    const game = new Game({...config, parent});
    // @ts-ignore
    game.scaleFactor = scaleFactor;
    return game;

}

export default StartGame;

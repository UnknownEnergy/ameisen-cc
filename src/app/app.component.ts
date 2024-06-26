import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PhaserGame } from '../game/phaser-game.component';
import { CommonModule } from '@angular/common';
import { EventBus } from '../game/EventBus';
import {GoogleLoginComponent} from "./google-login/google-login.component";

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, RouterOutlet, PhaserGame, GoogleLoginComponent],
    templateUrl: './app.component.html'
})
export class AppComponent implements AfterViewInit
{
    // This is a reference from the PhaserGame component
    @ViewChild(PhaserGame) phaserRef!: PhaserGame;

    ngAfterViewInit()
    {
        EventBus.on('current-scene-ready', (scene: Phaser.Scene) => {
        });
    }
}

import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {HttpClient, HttpClientModule} from "@angular/common/http";
import {gapi, loadGapiInsideDOM} from "gapi-script";
import {PhaserGame} from "../../game/phaser-game.component";
import {NgIf} from "@angular/common";

@Component({
    selector: 'app-google-login',
    standalone: true,
    imports: [
        HttpClientModule,
        PhaserGame,
        NgIf
    ],
    templateUrl: './google-login.component.html',
    styleUrl: './google-login.component.css'
})
export class GoogleLoginComponent implements OnInit {
    private clientId: string = '340545855934-fh3pjeqo9c2mmtbg10aa5e4bc3n1e447.apps.googleusercontent.com';
    private readonly SERVER_URI = 'https://grazer.duckdns.org:3000';
    isAuthSuccessful: boolean = false;

    constructor(private http: HttpClient,
                private cd: ChangeDetectorRef) {
    }

    ngOnInit(): void {
        this.initGoogleAuth();
    }

    initGoogleAuth() {
        loadGapiInsideDOM().then(() => {
            gapi.load('auth2', () => {
                gapi.auth2.init({
                    client_id: this.clientId,
                }).then(() => {
                    // @ts-ignore
                    this.attachSignin(document.getElementById('googleBtn'));
                });
            });
        });
    }

    attachSignin(element: HTMLElement) {
        const auth2 = gapi.auth2.getAuthInstance();
        auth2.attachClickHandler(element, {},
            (googleUser: { getAuthResponse: () => { (): any; new(): any; id_token: any; }; }) => {
                const id_token = googleUser.getAuthResponse().id_token;

                // Send the ID token to your server
                this.http.post(this.SERVER_URI + '/auth/google', {token: id_token}).subscribe(
                    (response) => {
                        console.log('Success:', response);
                        this.isAuthSuccessful = true;
                        this.cd.detectChanges();
                    },
                    (error) => {
                        console.error('Error:', error);
                        this.isAuthSuccessful = false;
                    }
                );
            },
            (error: any) => {
                console.error('Error attaching sign-in:', error);
            }
        );
    }
}

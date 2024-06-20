import {ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {HttpClient, HttpClientModule} from "@angular/common/http";
import {gapi, loadGapiInsideDOM} from "gapi-script";
import {PhaserGame} from "../../game/phaser-game.component";
import {NgIf} from "@angular/common";
import {environment} from "../../environments/environment";

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
    private clientId: string = environment.googleClientId;
    private readonly SERVER_URI = environment.apiUrl;
    isAuthSuccessful: boolean = false;
    isLoading: boolean = false;
    @ViewChild('googleBtn', {static: true}) googleBtn: ElementRef;

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
            (googleUser: { getAuthResponse: () => { (): any; new(): any; id_token: any; }
                getBasicProfile(): any;
            }) => {
                this.isLoading = true;
                this.cd.detectChanges();
                // Expose the token to the global scope
                (window as any).authToken = googleUser.getAuthResponse().id_token;
                // Retrieve email
                const profile = googleUser.getBasicProfile();
                (window as any).email = profile.getEmail();

                // Send the ID token to your server
                this.http.post(this.SERVER_URI + '/auth/google', {token:  (window as any).authToken}).subscribe(
                    (response) => {
                        console.log('Success:', response);
                        this.isAuthSuccessful = true;
                        this.isLoading = false;
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

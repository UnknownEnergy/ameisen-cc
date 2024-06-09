# Ameisen.cc

This is an open-source game inspired by an old game called ameisen.cc


![screenshot](screenshot.png)

## Requirements

[Node.js](https://nodejs.org) is required to install dependencies and run scripts via `npm`.  
[ng cli](https://angular.io/cli) is required to run the project.

## Available Commands

| Command | Description                                    |
|---------|------------------------------------------------|
| `npm install` | Install project dependencies                   |
| `npm run dev` | Launch a development web server                |
| `npm run build` | Create a production build in the `dist` folder |
| `npm run deploy` | Deploy pushed `dist` to github pages           |

## Production Github page

To access the game open https://unknownenergy.github.io/ameisen-cc/browser/

## Writing Code

After cloning the repo, run `npm install` from your project directory. Install ng cli with `npm install -g @angular/cli`. Then, you can start the local development server by running `npm run dev`.

The local development server runs on `http://localhost:8080`

Once the server is running you can edit any of the files in the `src` folder.  
Angular will automatically recompile your code and then reload the browser.

## Project Structure

- `index.html` - The HTML Angular entry point.
- `src` - Contains the Angular source code.
- `src/main.ts` - The main **Angular** entry point. This bootstraps the Angular application.
- `src/app/app.component.ts` - The main Angular component.
- `src/app/app.component.html` - The main HTML Angular component.
- `src/game/phaser-game.component.ts` - The Angular component that initializes the Phaser Game and serve like a bridge between Angular and Phaser.
- `src/game/EventBus.ts` - A simple event bus to communicate between Angular and Phaser.
- `src/game` - Contains the game source code.
- `src/game/main.ts` - The main **game** entry point. This contains the game configuration and start the game.
- `src/game/scenes/` - The Phaser Scenes are in this folder.
- `src/style.css` - Some simple CSS rules to help with page layout.
- `src/assets` - Contains the static assets used by the game.

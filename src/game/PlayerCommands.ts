export class PlayerCommands {

    speechBubble: any;
    commands: any;

    constructor(player: any, speechBubble: any,) {
        this.speechBubble = speechBubble;
        // Maintain a list of commands and their descriptions
        this.commands = {
            "home": {
                description: "Teleports the player to home position.",
                action: () => player.setPosition(9600, 8960)
            },
            "ogj": {
                description: "Teleports the player to OGJ position.",
                action: () => player.setPosition(1731, 9998)
            },
            "graz": {
                description: "Teleports the player to Graz.",
                action: () => player.setPosition(18114, 6306)
            },
            "bär": {
                description: "Teleports the player to Bär.",
                action: () => player.setPosition(12105, 6349)
            },
            "liebe": {
                description: "Teleports the player to Liebe.",
                action: () => player.setPosition(3211, 4423)
            },
            "exil": {
                description: "Teleports the player to Exil.",
                action: () => player.setPosition(18280, 881)
            },
            "wald": {
                description: "Teleports the player to Wald.",
                action: () => player.setPosition(9827, 1459)
            },
            "position": {
                description: "Displays the player's current position.",
                action: () => speechBubble.setText(`x: ${player.x} y: ${player.y}`)
            }
        };
    }

    executeCommand(typedText: string) {
        if (typedText.startsWith("/")) {
            const command = typedText.slice(1); // Remove the leading "/"
            if (command === "help") {
                this.showHelp();
            } else if (this.commands[command]) {
                this.commands[command].action();
            } else {
                this.speechBubble.setText(`Unknown command: ${command}`);
            }
        }
    }

    showHelp() {
        let helpText = "Available commands:\n";
        for (const cmd in this.commands) {
            helpText += `/${cmd}: ${this.commands[cmd].description}\n`;
        }
        this.speechBubble.setText(helpText);
    }
}

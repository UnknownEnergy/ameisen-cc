import {Scene} from "phaser";

export class PlayerCommands {

    speechBubble: any;
    commands: any;

    constructor(player: any, speechBubble: any, scene: any) {
        this.speechBubble = speechBubble;
        // Maintain a list of commands and their descriptions
        this.commands = {
            "gästeinsel": {
                description: "Teleports the player to Gäste Insel position.",
                action: () => player.setPosition(9600, 8960)
            },
            "ogjinsel": {
                description: "Teleports the player to OGJ Insel position.",
                action: () => player.setPosition(1731, 9998)
            },
            "bäreninsel": {
                description: "Teleports the player to Bären Insel.",
                action: () => player.setPosition(12105, 6349)
            },
            "märcheninsel": {
                description: "Teleports the player to Märchen Insel.",
                action: () => player.setPosition(20661, 1382)
            },
            "frieden": {
                description: "Teleports the player to Frieden.",
                action: () => player.setPosition(1361, 7210)
            },
            "wind": {
                description: "Teleports the player to Frieden.",
                action: () => player.setPosition(23106, 2015)
            },
            "hawai": {
                description: "Teleports the player to Hawai.",
                action: () => player.setPosition(20165, 8777)
            },
            "liebesinsel": {
                description: "Teleports the player to Liebesinsel.",
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
            "skin": {
                description: "Changes skin to chosen number.",
                action: (args: string[]) => {
                    const skinNumber = args[0];
                    player.setFrame(skinNumber);
                }
            },
            "p": {
                description: "Displays the player's current position.",
                action: () => speechBubble.setText(`x: ${player.x} y: ${player.y}`)
            },
            "i": {
                description: "Displays the player's inventory.",
                action: () => scene.inventoryManager.toggle()
            }
        };
    }

    executeCommand(typedText: string) {
        if (typedText.startsWith("/")) {
            const parts = typedText.slice(1).split(" "); // Remove the leading "/" and split the command and arguments
            const command = parts[0];
            const args = parts.slice(1);

            if (command === "help") {
                this.showHelp();
            } else if (this.commands[command]) {
                this.commands[command].action(args);
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

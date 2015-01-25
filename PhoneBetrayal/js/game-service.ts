module Betrayal {
    // GameService class
    export class GameService {
        playerId: string;

        game: any;

        player: any;

        otherPlayers: Array<any>;

        socket: any;

        constructor(socket: any) {
            this.playerId = null;
            this.socket = socket;
        }

        loadGame(gameData: any) {
            this.game = gameData;
            console.log("Game is now", this.game);
            for (var x in this.game.players) {
                var p = this.game.players[x];
                if (p.id === this.playerId) {
                    this.player = p;
                    // Shift players at the current player
                    this.otherPlayers = this.game.players.slice(x + 1).concat(this.game.players.slice(0, x));
                    break;
                }
            }

            // this.$digest();
        }

        loadPlayer(playerData: any) {
            this.player = playerData;
            console.log("Player is now", this.player);
            //gameService.$digest();
        }
    
        startGame() {
            console.log("startGame");
            this.socket.emit('start', function (err, game) {
                console.log(err, game);

            });
        }

        endRound() {
            console.log("endRound");
            this.socket.emit('end', function (err, game) {
                console.log(err, game);

            });
        }

        playCard(i : number) {
            // Get the card
            var card = this.player.hand[i];
            console.log("Play card", i, card);
            this.socket.emit('playCard', { card: i }, function (err) {
                if (err) console.log(err);
            });

        }

        setName(name : string) {
            this.socket.emit('name', { "name": name });
        }
    }     
}
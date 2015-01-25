module Betrayal {
    var GameServiceConstants = {
        playerNameCookie: "PlayerName"
    };

    // GameService class
    export class GameService {
        playerId: string;

        name: string;

        game: Betrayal.Server.IGame;

        player: Betrayal.Server.IPlayer;

        otherPlayers: Array<Betrayal.Server.IPlayer>;

        socket: SocketIOClient.Socket;

        private startGameCallback: Function;

        private hasStarted: boolean;

        private cookieStore: ng.cookies.ICookieStoreService;

        constructor(socket: SocketIOClient.Socket, cookieStore: ng.cookies.ICookieStoreService) {
            this.hasStarted = false;
            this.playerId = null;
            this.cookieStore = cookieStore;
            this.socket = socket;
            this.name = cookieStore.get(GameServiceConstants.playerNameCookie) || "";
        }

        loadGame(gameData: Betrayal.Server.IGame) {
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

            if (!this.hasStarted && (this.game.state == "active")) {
                this.hasStarted = true;
                this.startGameCallback();
                this.startGameCallback = null;
            } else if (this.hasStarted && (this.game.state == "ended")) {
                this.hasStarted = false;
            }

            // this.$digest();
        }

        loadPlayer(playerData: Betrayal.Server.IPlayer) {
            this.player = playerData;
            console.log("Player is now", this.player);
            //gameService.$digest();
        }
    
        startGame() {
            console.log("startGame");
            this.socket.emit('start', function (err, game: Betrayal.Server.IGame) {
                console.log(err, game);
            });
        }

        endRound() {
            console.log("endRound");
            this.socket.emit('end', function (err, game: Betrayal.Server.IGame) {
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
            if (this.name !== name) {
                this.name = name;
                this.cookieStore.put(GameServiceConstants.playerNameCookie, name);
            }                
        }

        setStartGameCallback(callback: Function) {
            this.startGameCallback = callback;
        }
    }     
}
module Betrayal {
    var GameServiceConstants = {
        playerNameCookie: "PlayerName"
    };

    var TargetNotNeeded = [
        "ROBOT",
        "GUARDIAN"
    ];

    // GameService class
    export class GameService {
        playerId: string;

        name: string;

        game: Betrayal.Server.IGame;

        player: Betrayal.Server.IPlayer;

        otherPlayers: Array<Betrayal.Server.IPlayer>;

        socket: SocketIOClient.Socket;

        messages: Array<string>;

        private gameChangedCallback: Function;

        private startGameCallback: Function;

        private hasStarted: boolean;

        private cookieStore: ng.cookies.ICookieStoreService;

        constructor(socket: SocketIOClient.Socket, cookieStore: ng.cookies.ICookieStoreService) {
            this.hasStarted = false;
            this.playerId = null;
            this.cookieStore = cookieStore;
            this.socket = socket;
            this.messages = [];
            this.name = cookieStore.get(GameServiceConstants.playerNameCookie) || "";
        }

        loadGame(gameData: Betrayal.Server.IGame) {
            if (this.playerId === null) {
                // ignore until we've joined
                return;
            }

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

            if (this.gameChangedCallback) {
                this.gameChangedCallback();
            }
        }

        loadPlayer(playerData: Betrayal.Server.IPlayer) {
            this.player = playerData;
            console.log("Player is now", this.player);

            if (this.gameChangedCallback) {
                this.gameChangedCallback();
            }
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

        actOnTarget(target: string) {
            // Get the card
            console.log("Play role", target);
            this.socket.emit('playRole', { target: target }, function (err) {
                if (err) console.log(err);
            });

        }

        needsTarget(): boolean {
            return TargetNotNeeded.indexOf(this.player.role) > -1;
        }

        onMessage(data: Map<string,string>) {
            var message = data[this.player.role];
            if (message) {
                // Display this message
                this.messages.unshift(message);

                if (this.gameChangedCallback) {
                    this.gameChangedCallback();
                }
            }
        }

        private onGameJoined(data: Betrayal.Server.IJoinResponseData) {
            this.socket.emit('name', { "name": this.name });
            // Join the game, get our player id back
            console.log("joined", data);
            this.playerId = data.player.id;
            this.loadGame(data.game);
            // gameService.loadPlayer(data.player);
        }

        joinGame() {
            this.socket.emit('join', this.onGameJoined.bind(this));
        }

        setName(name : string) {
            if (this.name !== name) {
                this.name = name;
                this.cookieStore.put(GameServiceConstants.playerNameCookie, name);
            }                
        }

        setStartGameCallback(callback: Function) {
            this.startGameCallback = callback;
        }

        setGameChangedCallback(callback: Function) {
            this.gameChangedCallback = callback;
        }
    }     
}
module Betrayal {
    var GameServiceConstants = {
        playerNameCookie: "PlayerName"
    };

    var TargetNotNeeded = [
        "ROBOT"
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

        canAct: boolean;

        hasStarted: boolean;

        private cookieStore: ng.cookies.ICookieStoreService;

        constructor(socket: SocketIOClient.Socket, cookieStore: ng.cookies.ICookieStoreService) {
            this.hasStarted = false;
            this.playerId = null;
            this.cookieStore = cookieStore;
            this.socket = socket;
            this.messages = [];
            this.name = cookieStore.get(GameServiceConstants.playerNameCookie) || "";
            this.onActionErrorCallback = this.onActionError.bind(this);
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
                this.canAct = true;
                this.messages = [];
            } else if (this.hasStarted && (this.game.state == "ended")) {
                this.hasStarted = false;
                this.canAct = false;
            }

            if (this.canAct && (this.player.state !== 'active')) {
                this.canAct = false;
                this.messages.unshift("You dead");
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

        private onActionErrorCallback: Function;
        
        onActionError(err: string) {
            if (err) {
                console.log(err);
                this.messages.unshift(err);
                this.canAct = true;

                if (this.gameChangedCallback) {
                    this.gameChangedCallback();
                }
            }
        }

        actOnTarget(target: string) {
            if (!this.canAct) {
                return;
            }

            this.canAct = false;

            // non-targeted effects should target ourselves
            if (target == '') {
                target = this.player.id;
            }

            console.log("Play role", target);
            this.socket.emit('playRole', { target: target }, this.onActionErrorCallback);
        }

        needsTarget(): boolean {
            return TargetNotNeeded.indexOf(this.player.role) < 0;
        }

        onMessage(data: Betrayal.Server.IMessageData) {
            if ((this.hasStarted) && (data.role === this.player.role)) {
                // Display this message
                this.messages.unshift(data.message);

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

        setGameChangedCallback(callback: Function) {
            this.gameChangedCallback = callback;
        }
    }     
}
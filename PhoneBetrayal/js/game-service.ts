module Betrayal {
    var GameServiceConstants = {
        playerNameCookie: "PlayerName",
        playerIdCookie: "PlayerId"
    };

    var TargetWhenDead = [
        "SNAKE"
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

        isConnected: boolean;

        isJoining: boolean;

        private cookieStore: ng.cookies.ICookieStoreService;

        constructor(socket: SocketIOClient.Socket, cookieStore: ng.cookies.ICookieStoreService) {
            this.hasStarted = false;
            this.isConnected = false;
            this.isJoining = false;
            this.playerId = null;
            this.cookieStore = cookieStore;
            this.messages = [];
            this.socket = null;
            this.name = cookieStore.get(GameServiceConstants.playerNameCookie) || "";
            this.onActionErrorCallback = this.onActionError.bind(this);
            this.onGameChangedCallback = this.loadGame.bind(this);
            this.onRoleMessageCallback = this.onMessage.bind(this);

            this.connect(socket);
        }

        connect(socket: SocketIOClient.Socket) {
            this.socket = socket;
            this.socket.on('game', this.onGameChangedCallback);
            this.socket.on('role', this.onRoleMessageCallback)

            var previousPlayerId = this.cookieStore.get(GameServiceConstants.playerIdCookie);
            if (previousPlayerId && (this.name.length >= 2)) {
                this.isJoining = true;
                this.socket.emit('join', { uuid: previousPlayerId, name: this.name }, this.onGameJoined.bind(this));
            }
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
            } else if (this.hasStarted && ((this.game.state == "endRound") || (this.game.state == "ended"))) {
                this.hasStarted = false;
                this.canAct = false;
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

        private onGameChangedCallback: Function;

        private onRoleMessageCallback: Function;
        
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

        targetWhenDead(): boolean {
            return TargetWhenDead.indexOf(this.player.role) >= 0;
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
            // Join the game, get our player id back
            this.isJoining = false;
            console.log("joined", data);
            if (data.player) {
                this.playerId = data.player.id;
                this.isConnected = true;
                this.socket.emit('name', { "name": this.name });
                this.cookieStore.put(GameServiceConstants.playerIdCookie, this.playerId);
                this.loadGame(data.game);
            } else {
                // let the UI know we failed to connect
                if (this.gameChangedCallback) {
                    this.gameChangedCallback();
                }
            }
            // gameService.loadPlayer(data.player);
        }

        joinGame() {
            this.isJoining = true;
            this.socket.emit('join', { name: this.name }, this.onGameJoined.bind(this));
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
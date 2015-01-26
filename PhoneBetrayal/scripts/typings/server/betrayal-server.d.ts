declare module Betrayal.Server {

    interface IPlayer {
        id: string;
        name: string;
        role: string;
        lives: number;
        state: string;
        score: number;
        success: boolean;
    }

    interface IGame {
        id: number;
        timer: number;
        players: Array<IPlayer>;
        state: string;
        deckActions: Map<string, string>;
    }

    interface IJoinResponseData {
        game: IGame;
        player: IPlayer;
    }

    interface IMessageData {
        role: string;
        message: string;
    }
}
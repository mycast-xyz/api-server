import { Config } from './Config';
import { AfreecaStreamLoader } from './manager/loader/afreeca/AfreecaStreamLoader';
import { KakaoBookLoader } from './manager/loader/KakaoBookLoader';
import { NaverMovieLoader } from './manager/loader/NaverMovieLoader';
import { OnnadaAnimationLoader } from './manager/loader/onnada/OnnadaAnimationLoader';
import { LolManager } from './manager/LolManager';
import { ExpressServerManager } from './manager/server/ExpressServerManager';
import { IServerManager } from './manager/server/IServerManager';
import { TwitchAccessTokenManager } from './models/twitch/TwitchAccessTokenManager';
import { TestApp } from './TestApp';

export class App {
    public static main(): void {
        const SERVER_PORT = 9010;
        const SERVER_PORT2 = 9011;

        const animationLoader = new OnnadaAnimationLoader();
        const bookLoader = new KakaoBookLoader();
        const movieLoader = new NaverMovieLoader();
        const afreecaLoader = new AfreecaStreamLoader();

        const serverManager: IServerManager = new ExpressServerManager(
            SERVER_PORT,
            SERVER_PORT2
        );
        serverManager.setIndexUri(`${Config.ROOT_DIR}/resource/index.html`);
        serverManager.setRiotApiCode(Config.RIOT_API_CODE);
        serverManager.setAnimationLoader(animationLoader);
        serverManager.setBookLoader(bookLoader);
        serverManager.setMovieLoader(movieLoader);
        serverManager.setAfreecaLoader(afreecaLoader);
        serverManager.start(`Api Server Started.. @${SERVER_PORT}`);

        LolManager.init();

        TwitchAccessTokenManager.getInstance().init();

        TestApp.main();
    }
}

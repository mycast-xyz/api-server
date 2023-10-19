import { Config } from './Config';
import { GfDollCacheLoader } from './manager/GfDollCacheLoader';
import { AfreecaStreamLoader } from './manager/loader/afreeca/AfreecaStreamLoader';
import { AfreecaUserLoader } from './manager/loader/afreeca/AfreecaUserLoader';
import { AzurLaneCacheLoader } from './manager/loader/AzurLaneCacheLoader';
import { CqWarriorCacheLoader } from './manager/loader/CqWarriorCacheLoader';
import { HentakuLoader } from './manager/loader/HentakuLoader';
import { HosHeroCacheLoader } from './manager/loader/HosHeroCacheLoader';
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
        const avActressLoader = new HentakuLoader();
        const alShipLoader = AzurLaneCacheLoader.getInstance();
        const cqWarriorLoader = CqWarriorCacheLoader.getInstance();
        const gfDollCacheLoader = GfDollCacheLoader.getInstance();
        const hosHeroLoader = HosHeroCacheLoader.getInstance();
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
        serverManager.setAvActressLoader(avActressLoader);
        serverManager.setAlShipLoader(alShipLoader);
        serverManager.setBookLoader(bookLoader);
        serverManager.setCqWarriorLoader(cqWarriorLoader);
        serverManager.setGfDollLoader(gfDollCacheLoader);
        serverManager.setHosHeroLoader(hosHeroLoader);
        serverManager.setMovieLoader(movieLoader);
        serverManager.setAfreecaLoader(afreecaLoader);
        serverManager.start(`Api Server Started.. @${SERVER_PORT}`);

        LolManager.init();

        TwitchAccessTokenManager.getInstance().init();

        TestApp.main();
    }
}

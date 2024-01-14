import * as bodyParser from 'body-parser';
import * as express from 'express';
import { readFileSync } from 'fs';
import * as http from 'http';
import * as https from 'https';
import { Config } from '../../Config';
import { AnimationData } from '../../models/Animation';
import * as AzurLane from '../../models/AzurLane';
import { BookInfo } from '../../models/BookInfo';
import * as Cq from '../../models/CrusaderQuest';
import { DollInfo } from '../../models/GirlsFrontline';
import * as Hos from '../../models/HeroesOfStorm';
import { LolGall } from '../../models/LolGall';
import { MovieData } from '../../models/MovieData';
import { ImgurLoader } from '../../models/photo/ImgurLoader';
import { VoiceActor } from '../../models/VoiceActor';
import { Logger } from '../../util/Logger';
import { AfreecaResult } from '../loader/afreeca/AfreecaResult';
import { Loader } from '../loader/common/Loader';
import { LolGallLoader } from '../loader/lolgall/LolGallLoader';
import { OnnadaCvLoader } from '../loader/onnada/OnnadaCvLoader';
import { IServerManager } from './IServerManager';
import { InvenRouter } from './route/inven/InvenRouter';
import { LolRouter } from './route/lol/LolRouter';
import { MemoRouter } from './route/memo/MemoRouter';
import { PhotoRouter } from './route/photo/PhotoRouter';
import { StreamRouter } from './route/stream/StreamRouter';
import { TwitchRouter } from './route/twitch/TwitchRouter';
import { UserRouter } from './route/user/UserRouter';
import { UsersRouter } from './route/users/UsersRouter';

export class ExpressServerManager implements IServerManager {
    private static ERROR_MSG = 'ERROR';

    private mLogger: Logger;
    private mPort: number;
    private mPort2: number;
    private mIndexUri: string | null;
    private mRiotApiCode: string | null;
    private mAnimationLoader: Loader<string, AnimationData> | null;
    private mAvActressLoader: Loader<string, Av.Actress> | null;
    private mAzurLaneLoader: Loader<string, AzurLane.ShipInfo> | null;
    private mBookLoader: Loader<string, BookInfo> | null;
    private mCqWarriorLoader: Loader<
        { name: string; star: number },
        Cq.WarriorInfo
    > | null;
    private mImgurLoader: ImgurLoader;
    private mVoiceActorLoader: Loader<string, VoiceActor>;
    private mGfDollLoader: Loader<string, DollInfo> | null;
    private mHosHeroLoader: Loader<string, Hos.HeroInfo> | null;
    private mMovieLoader: Loader<string, MovieData> | null;
    private mAfreecaLoader: Loader<string, AfreecaResult> | null = null;
    private mLolGallLoader: Loader<null, LolGall[]>;

    public constructor(port: number, port2: number) {
        this.mLogger = new Logger('ExpressServerManager');
        this.mPort = port;
        this.mPort2 = port2;
        this.mIndexUri = null;
        this.mRiotApiCode = null;
        this.mAnimationLoader = null;
        this.mAvActressLoader = null;
        this.mAzurLaneLoader = null;
        this.mBookLoader = null;
        this.mCqWarriorLoader = null;
        this.mImgurLoader = new ImgurLoader();
        this.mVoiceActorLoader = new OnnadaCvLoader();
        this.mGfDollLoader = null;
        this.mHosHeroLoader = null;
        this.mMovieLoader = null;
        this.mLolGallLoader = new LolGallLoader();
    }

    public setIndexUri(uri: string) {
        this.mIndexUri = uri;
    }

    public setRiotApiCode(code: string): void {
        this.mRiotApiCode = code;
    }

    public setAnimationLoader(loader: Loader<string, AnimationData>): void {
        this.mAnimationLoader = loader;
    }

    public setAvActressLoader(loader: Loader<string, Av.Actress>): void {
        this.mAvActressLoader = loader;
    }

    public setAlShipLoader(loader: Loader<string, AzurLane.ShipInfo>): void {
        this.mAzurLaneLoader = loader;
    }

    public setBookLoader(loader: Loader<string, BookInfo>): void {
        this.mBookLoader = loader;
    }

    public setCqWarriorLoader(
        loader: Loader<{ name: string; star: number }, Cq.WarriorInfo>
    ): void {
        this.mCqWarriorLoader = loader;
    }

    public setGfDollLoader(loader: Loader<string, DollInfo>): void {
        this.mGfDollLoader = loader;
    }

    public setHosHeroLoader(loader: Loader<string, Hos.HeroInfo>): void {
        this.mHosHeroLoader = loader;
    }

    public setMovieLoader(loader: Loader<string, MovieData>): void {
        this.mMovieLoader = loader;
    }

    public setAfreecaLoader(loader: Loader<string, AfreecaResult>): void {
        this.mAfreecaLoader = loader;
    }

    public start(welcomeMsg: string | null = null): void {
        const ca = readFileSync(Config.SSL_FULL_CHAIN);
        const key = readFileSync(Config.SSL_PRIV_KEY_PATH);
        const cert = readFileSync(Config.SSL_CERT_PATH);

        const app = express();
        const server = new http.Server(app);

        app.use(bodyParser.json({ limit: '20mb' }));
        app.use(bodyParser.urlencoded({ extended: true, limit: '20mb' }));

        app.use((req, res, next) => {
            const origin = req.headers.origin;
            if (typeof origin === 'string' && this.isWhiteList(origin)) {
                res.header('Access-Control-Allow-Origin', origin);
            }
            res.header(
                'Access-Control-Allow-Headers',
                'Origin, X-Requested-With, Content-Type, Accept'
            );
            next();
        });

        app.get('/', (_, res) => {
            if (this.mIndexUri === null) {
                res.send(ExpressServerManager.ERROR_MSG);
            } else {
                res.sendFile(this.mIndexUri);
            }
        });

        app.get('/riot.txt', (_, res) => {
            res.send(this.mRiotApiCode);
        });

        app.get('/animation/:animationName', (req, res) => {
            if (this.mAnimationLoader === null) {
                res.json(null);
                return;
            }

            const animationName = req.params.animationName;
            this.mAnimationLoader.load(animationName, (result) => {
                res.json(result);
            });
        });

        app.get('/av/actress/:name', (req, res) => {
            if (this.mAvActressLoader === null) {
                res.json(null);
                return;
            } else {
                const name = req.params.name;
                this.mAvActressLoader.load(name, (actress) => {
                    res.json(actress);
                });
            }
        });

        app.get('/azurlane/ship/:ship_name', (req, res) => {
            if (this.mAzurLaneLoader === null) {
                res.json(null);
            } else {
                const name = req.params.ship_name;
                this.mAzurLaneLoader.load(name, (ship) => {
                    res.json(ship);
                });
            }
        });

        app.get('/book/:book_name', (req, res) => {
            if (this.mBookLoader === null) {
                res.json(null);
            } else {
                const name = req.params.book_name;
                this.mBookLoader.load(name, (book) => {
                    res.json(book);
                });
            }
        });

        app.get('/crusaderquest/warrior/:warrior_name', (req, res) => {
            if (this.mCqWarriorLoader === null) {
                res.json(null);
            } else {
                const name = req.params.warrior_name;
                const rawStar = req.query.star?.toString() || '-1';
                const star: number = parseInt(rawStar) || -1;
                this.mCqWarriorLoader.load({ name, star }, (warrior) => {
                    res.json(warrior);
                });
            }
        });

        app.get('/cv/:name', (req, res) => {
            const name: string = req.params.name;
            this.mVoiceActorLoader.load(name, (voiceActor) => {
                res.json(voiceActor);
            });
        });

        app.get('/gf/doll/:keyword', (req, res) => {
            if (this.mGfDollLoader === null) {
                res.json(null);
                return;
            } else {
                const keyword: string = req.params.keyword;
                this.mGfDollLoader.load(keyword, (doll) => {
                    res.json(doll);
                });
            }
        });

        app.get('/hos/hero/:hero_name', (req, res) => {
            if (this.mHosHeroLoader === null) {
                res.json(null);
            } else {
                const heroName = req.params.hero_name;
                this.mHosHeroLoader.load(heroName, (hero) => {
                    res.json(hero);
                });
            }
        });

        app.get('/movie/:query', (req, res) => {
            if (this.mMovieLoader === null) {
                res.json(null);
                return;
            }

            const query = req.params.query;
            this.mMovieLoader.load(query, (result) => {
                if (result) {
                    this.mLogger.v(`Movie-Success: ${result.title}`);
                    res.json(result);
                } else {
                    this.mLogger.v(`Movie-Failed: ${query}`);
                    res.json(null);
                }
            });
        });

        app.get('/afreeca/:afreecaId', (req, res) => {
            if (!this.mAfreecaLoader) {
                res.json(null);
                return;
            }

            const { afreecaId } = req.params;
            this.mAfreecaLoader.load(afreecaId, (result) => {
                if (result) {
                    res.json(result);
                } else {
                    res.json(null);
                }
            });
        });

        app.get('/imgur/:hash', async (req, res) => {
            try {
                const hash = req.params.hash;
                const imgurPhoto = await this.mImgurLoader.getResult(hash);
                res.json(imgurPhoto);
            } catch {
                res.send();
            }
        });

        app.use('/memo', new MemoRouter().getRouter());
        app.use('/inven', new InvenRouter().getRouter());
        app.use('/stream', new StreamRouter().getRouter());
        app.use('/user', new UserRouter().getRouter());
        app.use('/users', new UsersRouter().getRouter());
        app.use('/lol', new LolRouter().getRouter());
        app.use('/photo', new PhotoRouter().getRouter());
        app.use('/twitch', new TwitchRouter().getRouter());

        app.get('/lolgalls', (req, res) => {
            this.mLolGallLoader.load(null, (galls) => {
                res.json(galls);
            });
        });

        const thumbnailDir = Config.THUMBNAIL_DIR;
        if (!thumbnailDir && thumbnailDir.length === 0) {
            this.mLogger.w('thumbnails directory not set. skipped');
        } else {
            app.use('/thumbs', express.static(thumbnailDir));
        }

        server.listen(this.mPort, () => {
            this.mLogger.v(welcomeMsg);
        });

        const server2 = https.createServer({ cert, key, ca }, app);
        server2.listen(this.mPort2, () => {
            this.mLogger.v(welcomeMsg);
        });
    }

    private isWhiteList(host: string): boolean {
        const whiteList = [
            'http://localhost:4200',
            'http://localhost:5000',
            'http://mycast.xyz',
            'https://mycast.xyz',
            'https://test.mycast.xyz',
            'http://mycast.xyz:10080',
        ];
        return whiteList.indexOf(host) > -1;
    }
}

import Axios from 'axios';
import * as Hos from '../../models/HeroesOfStorm';
import { BaseLoader } from './BaseLoader';
import { HeroLoader } from './HeroLoader';

export class HosHeroLoader extends BaseLoader<null, Hos.HeroInfo[]> {
    private static readonly HEROES_URL: string =
        'http://kr.battle.net/heroes/ko/heroes/';

    private static readonly RESOURSE_URL: string =
        'http://kr.battle.net/heroes/static';

    private mLinks: string[] = [];
    private mOutput: Hos.HeroInfo[] = [];

    protected loadData(): void {
        const option = { url: HosHeroLoader.HEROES_URL, timeout: 5000 };
        const opt = { timeout: 5000 };
        Axios.get(HosHeroLoader.HEROES_URL, opt).then((res) => {
            if (res.status !== 200 || !res.data) {
                this.mCallback(null);
                return;
            }

            const jsonHeroes = res.data.match(/window\.heroes = (\[.*\]);/);
            if (!jsonHeroes || !jsonHeroes[1]) {
                this.mCallback(null);
                return;
            }
            const raw: Hos.RawHeroInfo[] = JSON.parse(jsonHeroes[1]);
            this.mLinks = raw.map((e) => {
                return HosHeroLoader.HEROES_URL + e.slug + '/';
            });
            this.loadHero();
        });
    }

    private loadHero() {
        const loadFunc = (index: number) => {
            if (index >= this.mLinks.length) {
                this.mCallback(this.mOutput);
            } else {
                const loader = new HeroLoader();
                loader.load(this.mLinks[index], (hero) => {
                    if (hero !== null) {
                        this.mOutput.push(hero);
                    }
                    loadFunc(index + 1);
                });
            }
        };
        loadFunc(0);
    }
}

import Axios from 'axios';
import * as Hos from '../../models/HeroesOfStorm';
import { BaseLoader } from './BaseLoader';

export class HeroLoader extends BaseLoader<string, Hos.HeroInfo> {
    protected loadData() {
        if (this.mInput == null) {
            this.mCallback(null);
            return;
        }
        const url = this.mInput;
        const option = { timeout: 5000 };
        Axios.get(url, option).then((res) => {
            if (res.status !== 200 || !res.data) {
                this.mCallback(null);
                return;
            }
            const rawHeroInfo = HeroLoader.parseRawJson(res.data);
            if (rawHeroInfo == null) {
                this.mCallback(null);
                return;
            }
            const keyId = rawHeroInfo.slug;
            const name = rawHeroInfo.name;
            const title = rawHeroInfo.baseHeroInfo.title;
            const franchise = rawHeroInfo.franchise;
            const description = rawHeroInfo.baseHeroInfo.description;
            const baseInfos: Hos.BaseInfo[] = [];
            if (rawHeroInfo.auxiliaryHeroInfo.length > 0) {
                const jsons: any[] = rawHeroInfo.auxiliaryHeroInfo;
                jsons.forEach((json) => {
                    const stance = json.heroStanceName;
                    const stanceId = json.stanceSlug;
                    const mainSlug = keyId;
                    const subSlug = json.stanceSlug;
                    const rawSkin: any[] = rawHeroInfo.skins;
                    const skins = rawSkin.map<Hos.SkinInfo>((e) => ({
                        name: e.name,
                        description: e.description,
                        keyId: e.slug,
                        icon:
                            'http://media.blizzard.com/heroes/' +
                            mainSlug +
                            '/skins/thumbnails/' +
                            subSlug +
                            '/' +
                            e.slug +
                            '.jpg',
                        imageUrl:
                            'http://media.blizzard.com/heroes/' +
                            mainSlug +
                            '/skins/frames/' +
                            subSlug +
                            '/' +
                            e.slug +
                            '_frame.jpg',
                        videoUrl:
                            'http://media.blizzard.com/heroes/' +
                            mainSlug +
                            '/skins/videos/' +
                            subSlug +
                            '/' +
                            e.slug +
                            '.webm',
                    }));
                    const rawSkill: any[] = json.abilities;
                    const skills = rawSkill.map<Hos.SkillInfo>((e) => ({
                        name: e.name,
                        description: e.description,
                        keyId: e.slug,
                        icon:
                            'http://media.blizzard.com/heroes/' +
                            mainSlug +
                            '/abilities/icons/' +
                            subSlug +
                            '/' +
                            e.slug +
                            '.png',
                        thumbnail:
                            'http://media.blizzard.com/heroes/' +
                            mainSlug +
                            '/abilities/thumbnails/' +
                            subSlug +
                            '/' +
                            e.slug +
                            '.jpg',
                    }));
                    // ult
                    const rawUlt: any[] = json.heroicAbilities;
                    const ults = rawUlt.map<Hos.SkillInfo>((e) => ({
                        name: e.name,
                        description: e.description,
                        keyId: e.slug,
                        icon:
                            'http://media.blizzard.com/heroes/' +
                            mainSlug +
                            '/abilities/icons/' +
                            subSlug +
                            '/' +
                            e.slug +
                            '.png',
                        thumbnail:
                            'http://media.blizzard.com/heroes/' +
                            mainSlug +
                            '/abilities/thumbnails/' +
                            subSlug +
                            '/' +
                            e.slug +
                            '.jpg',
                    }));
                    // passive
                    const rawPassive: any = json.trait;
                    const passive: Hos.SkillInfo = {
                        keyId: rawPassive.slug,
                        name: rawPassive.name,
                        description: rawPassive.description,
                        icon:
                            'http://media.blizzard.com/heroes/' +
                            mainSlug +
                            '/abilities/icons/' +
                            subSlug +
                            '/' +
                            rawPassive.slug +
                            '.png',
                    };
                    baseInfos.push({
                        stanceId,
                        stance,
                        skins,
                        skills,
                        ults,
                        passive,
                    });
                });
            } else {
                const mainSlug = keyId;
                const rawSkin: any[] = rawHeroInfo.skins;
                const skins = rawSkin.map<Hos.SkinInfo>((e) => ({
                    name: e.name,
                    description: e.description,
                    keyId: e.slug,
                    icon:
                        'http://media.blizzard.com/heroes/' +
                        mainSlug +
                        '/skins/thumbnails/' +
                        e.slug +
                        '.jpg',
                    imageUrl:
                        'http://media.blizzard.com/heroes/' +
                        mainSlug +
                        '/skins/frames/' +
                        e.slug +
                        '_frame.jpg',
                    videoUrl:
                        'http://media.blizzard.com/heroes/' +
                        mainSlug +
                        '/skins/videos/' +
                        e.slug +
                        '.webm',
                }));
                const rawSkill: any[] = rawHeroInfo.baseHeroInfo.abilities;
                const skills = rawSkill.map<Hos.SkillInfo>((e) => ({
                    name: e.name,
                    description: e.description,
                    keyId: e.slug,
                    icon:
                        'http://media.blizzard.com/heroes/' +
                        mainSlug +
                        '/abilities/icons/' +
                        e.slug +
                        '.png',
                    thumbnail:
                        'http://media.blizzard.com/heroes/' +
                        mainSlug +
                        '/abilities/thumbnails/' +
                        e.slug +
                        '.jpg',
                }));
                // ult
                const rawUlt: any[] = rawHeroInfo.baseHeroInfo.heroicAbilities;
                const ults = rawUlt.map<Hos.SkillInfo>((e) => ({
                    name: e.name,
                    description: e.description,
                    keyId: e.slug,
                    icon:
                        'http://media.blizzard.com/heroes/' +
                        mainSlug +
                        '/abilities/icons/' +
                        e.slug +
                        '.png',
                    thumbnail:
                        'http://media.blizzard.com/heroes/' +
                        mainSlug +
                        '/abilities/thumbnails/' +
                        e.slug +
                        '.jpg',
                }));
                // passive
                const rawPassive = rawHeroInfo.baseHeroInfo.trait;
                const passive = {
                    name: rawPassive.name,
                    description: rawPassive.description,
                    keyId: rawPassive.slug,
                    icon:
                        'http://media.blizzard.com/heroes/' +
                        mainSlug +
                        '/abilities/icons/' +
                        rawPassive.slug +
                        '.png',
                };
                baseInfos.push({ skins, skills, ults, passive });
            }
            this.mCallback({
                keyId,
                name,
                title,
                franchise,
                url,
                description,
                baseInfos,
            });
        });
    }
    private static parseIcon(raw: string): string {
        const iconRegex = /.*<meta.*"og:image".*content="(.*?)".*\/>.*/;
        return raw.replace(iconRegex, '$1');
    }
    private static parseRawJson(raw: string): Hos.RawHeroInfo | null {
        const rawHero = raw.match(/window\.hero = (\{.*\});/);
        if (!rawHero || !rawHero[1]) {
            return null;
        }
        return JSON.parse(rawHero[1]);
    }
}

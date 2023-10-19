import { LolChampion } from '../models/Lol';
import { ChampionDto } from '../models/LolApi';
import { LolUtils } from '../util/LolUtils';
import { TextUtils } from '../util/TextUtils';
import { LolManager } from './LolManager';

export class LolChampionManager {
    public static getChampionInfo(championName: string): LolChampion | null {
        const champions = LolManager.getRawChampions();
        const version = LolManager.getVersion();

        const champion = champions.find((c) => {
            return TextUtils.isLike(c.name, championName);
        });

        if (champion === undefined) {
            return null;
        }

        return this.parseRaw(champion);
    }

    private static parseRaw(raw: ChampionDto): LolChampion {
        const version = LolManager.getVersion();
        const result: LolChampion = {
            link: LolUtils.getOpggChampionUri(raw.id),
            key: raw.key,
            name: raw.name,
            icon: LolUtils.getIconUri('champion', raw.image.full),
            description: raw.title,
            tags: raw.tags,
            lore: raw.lore,
            skin: raw.skins.map((e) => {
                return {
                    name: e.name,
                    splash: LolUtils.getSplashArt(version, raw.key, e.num),
                };
            }),
            skill: [
                {
                    name: raw.passive.name,
                    description: raw.passive.description,
                    icon: LolUtils.getAbilityIcon(version, raw.key, 'passive'),
                },
                {
                    name: raw.spells[0].name,
                    description: raw.spells[0].description,
                    icon: LolUtils.getAbilityIcon(version, raw.key, 'q'),
                },
                {
                    name: raw.spells[1].name,
                    description: raw.spells[1].description,
                    icon: LolUtils.getAbilityIcon(version, raw.key, 'w'),
                },
                {
                    name: raw.spells[2].name,
                    description: raw.spells[2].description,
                    icon: LolUtils.getAbilityIcon(version, raw.key, 'e'),
                },
                {
                    name: raw.spells[3].name,
                    description: raw.spells[3].description,
                    icon: LolUtils.getAbilityIcon(version, raw.key, 'r'),
                },
            ],
            version,
        };
        return result;
    }
}

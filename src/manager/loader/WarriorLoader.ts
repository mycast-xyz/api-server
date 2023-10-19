import Axios from 'axios';
import * as cheerio from 'cheerio';
import * as CrusaderQuest from '../../models/CrusaderQuest';
import { Base64Builder } from '../../util/Base64Builder';
import { Logger } from '../../util/Logger';
import { BaseLoader } from './BaseLoader';

export class WarriorLoader extends BaseLoader<
    string,
    CrusaderQuest.WarriorInfo
> {
    private mLogger: Logger;
    // Base
    private mLink: string = '';
    private mName: string = '';
    private mType: string = '';
    private mDescription: string = '';
    private mStar: number = 0;
    private mBaseComplete: boolean = false;
    // Icon
    private mIcon: string = '';
    private mIconComplete: boolean = false;
    // Passive
    private mPassive: CrusaderQuest.PassiveInfo = {
        name: '',
        ability: '',
    };
    // Block Skill
    private mBlockSkill: CrusaderQuest.BlockSkillInfo = {
        name: '',
        icon: '',
        ability: '',
    };
    private mBlockSkillComplete: boolean = false;
    // Costume
    private mCostumes: CrusaderQuest.CostumeInfo[] = [];
    private mCostumeComplete: boolean = false;
    // UltWeapon
    private mUltWeapon: CrusaderQuest.UltWeaponInfo | null = null;
    private mUltWeaponComplete: boolean = false;

    public constructor() {
        super();
        this.mLogger = new Logger('WarriorLoader');
    }

    protected loadData() {
        if (!this.mInput) {
            this.mCallback(null);
            return;
        }
        const url: string = this.mInput;
        const opt = { timeout: 5000 };
        this.mLink = url;
        Axios.get(url, opt).then((res) => {
            if (res.status !== 200 || !res.data) {
                this.mCallback(null);
                return;
            }
            const $ = cheerio.load(res.data, {
                normalizeWhitespace: true,
                decodeEntities: false,
            });
            this.mName = $('.detailprofile tr th').first().text();
            this.mType = $('.discript tr td').eq(0).text();
            this.mDescription = $('.discript2').text();
            const rawStar = $('.detailprofile th img').attr('src') || '';
            this.mStar = parseInt(rawStar.replace(/.*_(\d)\.png/, '$1'));
            const icon = $('.detailprofile td.iconimage img').attr('src') || '';
            Base64Builder.convertToBase64(icon, (result) => {
                if (result !== null) {
                    this.mIcon = result;
                }
                this.mIconComplete = true;
                this.onLoadComplete();
            });
            const rawSkill: string | null = $('.bskill td').eq(1).html();
            if (rawSkill) {
                const skillIcon = $('.bskill img').attr('src') || '';
                const name = $('.bskill td b').eq(0).text();
                const ability = rawSkill.split('<br>')[2];
                Base64Builder.convertToBase64(skillIcon, (base64Icon) => {
                    this.mBlockSkill = { name, icon: base64Icon, ability };
                    this.mBlockSkillComplete = true;
                    this.onLoadComplete();
                });
                const passiveName = $('.bskill td b').eq(1).text();
                this.mPassive = {
                    name: passiveName,
                    ability: rawSkill.split('<br>')[6],
                };
            }
            const $costumes = $('.costumedata table');
            const length = $costumes.length;
            let completeIcon = 0;
            if ($costumes.length === 0) {
                this.mCostumeComplete = true;
                this.onLoadComplete();
            }
            $costumes.each((_, e) => {
                const $e = $(e);
                const name = $e.find('td').eq(1).text();
                const rawIcon = $e.find('img').attr('src') || '';
                const ability: string[] = [];
                $e.find('td').each((i, td) => {
                    if (i < 2) { return; }
                    ability.push($(td).text());
                });
                Base64Builder.convertToBase64(rawIcon, (costumeIcon) => {
                    this.mCostumes.push({ name, icon: costumeIcon, ability });
                    completeIcon++;
                    if (length === completeIcon) {
                        this.mCostumeComplete = true;
                        this.onLoadComplete();
                    }
                });
            });
            const $ultWeapon = $('.cWeapon');
            if ($ultWeapon.length === 0) {
                this.mUltWeaponComplete = true;
                this.onLoadComplete();
            } else {
                const name = $ultWeapon.find('b').text();
                const abilityText = $ultWeapon.find('td').eq(1).html();
                const ability =
                    abilityText !== null ? abilityText.split('<br>')[3] : '';
                const rawIcon = $ultWeapon.find('img').attr('src') || '';
                Base64Builder.convertToBase64(rawIcon, (ultIcon) => {
                    this.mUltWeapon = { name, icon: ultIcon, ability };
                    this.mUltWeaponComplete = true;
                    this.onLoadComplete();
                });
            }
            this.mBaseComplete = true;
            this.onLoadComplete();
        });
    }
    private onLoadComplete(): void {
        if (
            this.mIconComplete &&
            this.mBlockSkillComplete &&
            this.mCostumeComplete &&
            this.mUltWeaponComplete
        ) {
            this.mLogger.v(this.mName);
            this.mCallback(this.getOutput());
        }
    }
    private getOutput(): CrusaderQuest.WarriorInfo {
        return {
            link: this.mLink,
            name: this.mName,
            icon: this.mIcon,
            type: this.mType,
            star: this.mStar,
            attack: 0,
            hp: 0,
            critical: 0,
            defense: 0,
            magicDefense: 0,
            description: this.mDescription,
            costumes: this.mCostumes,
            blockSkill: this.mBlockSkill,
            passive: this.mPassive,
            ultWeapon: this.mUltWeapon,
        };
    }
}

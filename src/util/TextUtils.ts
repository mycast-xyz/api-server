export class TextUtils {
    public static isLike(str1: string, str2: string): boolean {
        return str1.replace(/ /g, '') === str2.replace(/ /g, '');
    }
}

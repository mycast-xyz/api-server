import Axios from 'axios';

export class LolVersionFetcher {
    public async fetchVersion(): Promise<string> {
        const url = 'https://ddragon.leagueoflegends.com/api/versions.json';
        const { data } = await Axios.get(url, { timeout: 5000 });
        return data[0];
    }
}

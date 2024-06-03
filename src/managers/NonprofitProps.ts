import { GeneralNonprofitInfo } from '../types/index.js';
import { PropertyManager } from './PropertyManager.js';

export class NonprofitProps<T extends GeneralNonprofitInfo> extends PropertyManager<T> {
    constructor(nonprofitInfo: T) {
        super();
        this.properties = new Map(Object.entries(nonprofitInfo) as [keyof T, T[keyof T] | null][]);
    }
}
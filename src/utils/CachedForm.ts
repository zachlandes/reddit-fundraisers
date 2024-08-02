import { PropertyManager } from '../managers/PropertyManager.js';
import type { TypeMapping } from '../types/index.js';
import { FundraiserStatus } from '../types/index.js';
import { TypeKeys } from './typeHelpers.js';

export class CachedForm {
    private aggregates: Map<keyof TypeMapping, PropertyManager<any>> = new Map();
    private lastUpdated?: string;
    private status: FundraiserStatus | undefined = undefined;

    constructor() {}

    private initializeProperties<K extends keyof TypeMapping>(key: K, info: TypeMapping[K]): void {
        console.debug(`Initializing ${key} with:`, info);
        this.aggregates.set(key, new PropertyManager<TypeMapping[K]>(info));
        this.setLastUpdated(new Date().toISOString()); // Update lastUpdated when initializing properties
    }

    private setProperty<K extends keyof TypeMapping, V>(key: K, propKey: keyof TypeMapping[K], value: V): void {
        console.debug(`Setting ${key} ${String(propKey)} to`, value);
        let manager = this.aggregates.get(key);
        if (!manager) {
            manager = new PropertyManager<TypeMapping[K]>();
            this.aggregates.set(key, manager);
        }
        manager.setProperty(propKey, value);
        this.setLastUpdated(new Date().toISOString()); // Update lastUpdated whenever a property is set
    }

    private getProperty<K extends keyof TypeMapping, V>(key: K, propKey: keyof TypeMapping[K]): V | null {
        const manager = this.aggregates.get(key);
        if (!manager) {
            throw new Error(`${key} is not initialized.`);
        }
        return manager.getProperty(propKey);
    }

    private getAllProperties<K extends keyof TypeMapping>(key: K): TypeMapping[K] {
        const manager = this.aggregates.get(key);
        if (!manager) {
            throw new Error(`${key} is not initialized.`);
        }
        return manager.getAllProperties();
    }

    initialize(key: keyof TypeMapping, info: any): void {
        this.initializeProperties(key, info);
    }

    setProp<K extends keyof TypeMapping, V>(key: K, propKey: keyof TypeMapping[K], value: V): void {
        this.setProperty(key, propKey, value);
    }

    getProp<K extends keyof TypeMapping, V>(key: K, propKey: keyof TypeMapping[K]): V | null {
        return this.getProperty(key, propKey);
    }

    getAllProps<K extends keyof TypeMapping>(key: K): TypeMapping[K] {
        return this.getAllProperties(key);
    }

    setLastUpdated(date: string): void {
        this.lastUpdated = date;
    }

    getLastUpdated(): string | undefined {
        return this.lastUpdated;
    }

    setStatus(status: FundraiserStatus | undefined): void {
        this.status = status;
        this.setLastUpdated(new Date().toISOString());
    }

    getStatus(): FundraiserStatus {
        const active = this.getProp(TypeKeys.everyExistingFundraiserInfo, 'active');
        if (active !== null) {
            return active ? FundraiserStatus.Active : FundraiserStatus.Completed;
        }
        return FundraiserStatus.Unknown; // Default to Unknown if status is not set
    }

    serializeForRedis(): Record<string, any> {
        const result: Record<string, any> = {};
        this.aggregates.forEach((manager, key) => {
            if (typeof key !== 'string') {
                console.error(`Invalid key type: ${typeof key}`);
            }
            result[key] = manager.serialize();
        });
        result.lastUpdated = this.lastUpdated;
        result.status = this.status;
        return result;
    }

    deserializeFromRedis(data: Record<string, any>): void {
        Object.entries(data).forEach(([key, value]) => {
            if (key !== 'lastUpdated' && key !== 'status') {
                const manager = new PropertyManager<any>();
                manager.deserialize(value);
                this.aggregates.set(key as keyof TypeMapping, manager);
            }
        });
        this.lastUpdated = data.lastUpdated;
        this.status = data.status;
    }
}
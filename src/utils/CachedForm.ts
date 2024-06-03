import { PropertyManager } from '../managers/PropertyManager.js';
import type { GeneralNonprofitInfo, BaseFormFields, TypeMapping } from '../types/index.js';

export class CachedForm {
    private aggregates: Map<keyof TypeMapping, PropertyManager<any>> = new Map();
    private lastUpdated?: string;

    constructor() {}

    private initializeProperties<K extends keyof TypeMapping>(key: K, info: TypeMapping[K]): void {
        console.debug(`Initializing ${key} with:`, info);
        this.aggregates.set(key, new PropertyManager<TypeMapping[K]>(info));
    }

    private setProperty<K extends keyof TypeMapping, V>(key: K, propKey: keyof TypeMapping[K], value: V): void {
        console.debug(`Setting ${key} ${String(propKey)} to`, value);
        let manager = this.aggregates.get(key);
        if (!manager) {
            manager = new PropertyManager<TypeMapping[K]>();
            this.aggregates.set(key, manager);
        }
        manager.setProperty(propKey, value);
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

    serializeForRedis(): Record<string, any> {
        const result: Record<string, any> = {};
        this.aggregates.forEach((manager, key) => {
            result[key] = manager.serialize();
        });
        result.lastUpdated = this.lastUpdated;
        return result;
    }

    deserializeFromRedis(data: Record<string, any>): void {
        Object.entries(data).forEach(([key, value]) => {
            if (key !== 'lastUpdated') {
                const manager = new PropertyManager<any>();
                manager.deserialize(value);
                this.aggregates.set(key as keyof TypeMapping, manager);
            }
        });
        this.lastUpdated = data.lastUpdated;
    }
}
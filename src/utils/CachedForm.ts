import type { EveryNonprofitInfo, GeneralNonprofitInfo } from '../sources/Every.js';

export interface TypeMapping {
    generalNonprofitInfo: GeneralNonprofitInfo;
    everyNonprofitInfo: EveryNonprofitInfo;
    baseFormFields: BaseFormFields;
    fundraiserFormFields: FundraiserFormFields;
}

// Identity function to ensure type safety
function createTypeKeys<T>(t: { [P in keyof T]: P }): { [P in keyof T]: P } {
    return t;
}

// This will have to be updated whenever new keys are added to TypeMapping
export const TypeKeys = createTypeKeys<TypeMapping>({
    generalNonprofitInfo: 'generalNonprofitInfo',
    everyNonprofitInfo: 'everyNonprofitInfo',
    baseFormFields: 'baseFormFields',
    fundraiserFormFields: 'fundraiserFormFields'
});

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

export type BaseFormFields = {
    formDescription: string | null;
    formTitle: string | null;
    [key: string]: string | null;
};

export type FundraiserFormFields = BaseFormFields & {
    formImageUrl: string | null;
};

// Generic base class for managing key-value pairs
export class PropertyManager<T> {
    protected properties: Map<keyof T, T[keyof T] | null>;

    constructor(initialProperties?: Partial<T>) {
        this.properties = new Map<keyof T, T[keyof T] | null>();
        if (initialProperties) {
            for (const [key, value] of Object.entries(initialProperties)) {
                this.properties.set(key as keyof T, value as T[keyof T]);
            }
        }
    }

    setProperty<K extends keyof T>(key: K, value: T[K]): void {
        this.properties.set(key, value);
    }

    getProperty<K extends keyof T>(key: K): T[K] | null {
        return this.properties.get(key) as T[K] | null;
    }

    serialize(): Record<string, any> {
        const result: Record<string, any> = {};
        this.properties.forEach((value, key) => {
            result[key as string] = value ?? null;
        });
        return result;
    }

    deserialize(data: Record<string, any>): void {
        for (const [key, value] of Object.entries(data)) {
            this.properties.set(key as keyof T, value);
        }
    }

    getAllProperties(): T {
        const allProps = {} as T;
        this.properties.forEach((value, key) => {
            allProps[key] = value as T[keyof T];
        });
        return allProps;
    }
}

// Specific class for nonprofit properties
export class NonprofitProps<T extends GeneralNonprofitInfo> extends PropertyManager<T> {
    constructor(nonprofitInfo: T) {
        super();
        this.properties = new Map(Object.entries(nonprofitInfo) as [keyof T, T[keyof T] | null][]);
    }
}

// Specific class for form fields
export class FormField<T extends BaseFormFields> extends PropertyManager<T> {
    constructor() {
        super();
    }
}

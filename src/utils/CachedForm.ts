import type { GeneralNonprofitInfo } from '../sources/Every.js';


export class CachedForm<T extends GeneralNonprofitInfo, F extends BaseFormFields> {
    private formFields?: FormField<F>;
    private nonprofitProps?: NonprofitProps<T>;
    private lastUpdated?: string;

    constructor() {
    }

    initializeFormFields(formFieldsInitial: Partial<F>): void {
        console.debug("Initializing form fields with:", formFieldsInitial);
        this.formFields = new FormField<F>();
        Object.keys(formFieldsInitial).forEach(key => {
            this.formFields!.setProperty(key as keyof F, formFieldsInitial[key] as F[keyof F]);
        });
    }

    initializeNonprofitProps(nonprofitInfo: T): void {
        console.debug("Initializing nonprofit properties with:", nonprofitInfo);
        this.nonprofitProps = new NonprofitProps<T>(nonprofitInfo);
    }

    setFormField<K extends keyof F>(key: K, value: F[K]): void {
        console.debug(`Setting form field ${String(key)} to`, value);
        if (!this.formFields) {
            this.formFields = new FormField<F>();
        }
        this.formFields.setProperty(key, value);
    }

    getFormField(key: keyof F): string | null {
        if (!this.formFields) {
            throw new Error("Form fields are not initialized.");
        }
        return this.formFields.getProperty(key);
    }

    getNonprofitProp<K extends keyof T>(key: K): T[K] | null {
        if (!this.nonprofitProps) {
            throw new Error("Nonprofit properties are not initialized.");
        }
        return this.nonprofitProps.getProperty(key);
    }

    setNonprofitProp<K extends keyof T>(key: K, value: T[K]): void {
        console.debug(`Setting nonprofit property ${String(key)} to`, value);
        if (!this.nonprofitProps) {
            throw new Error("Nonprofit properties are not initialized.");
        }
        this.nonprofitProps.setProperty(key, value);
    }

    getAllNonprofitProps(): T {
        if (!this.nonprofitProps) {
            throw new Error("Nonprofit properties are not initialized.");
        }
        return this.nonprofitProps.getAllProperties();
    }

    getAllFormFields(): F {
        if (!this.formFields) {
            throw new Error("Form fields are not initialized.");
        }
        return this.formFields.getAllProperties();
    }

    setLastUpdated(date: string): void {
        this.lastUpdated = date;
    }

    getLastUpdated(): string | undefined {
        return this.lastUpdated;
    }

    serializeForRedis(): Record<string, any> {
        return {
            formFields: this.formFields ? this.formFields.serialize() : {},
            nonprofitProps: this.nonprofitProps ? this.nonprofitProps.getAllProperties() : {},
            lastUpdated: this.lastUpdated
        };
    }

    deserializeFromRedis(data: Record<string, any>): void {
        if (data.formFields) {
            this.formFields = new FormField<F>(); 
            this.formFields.deserialize(data.formFields);
        }
        if (data.nonprofitProps) {
            this.nonprofitProps = new NonprofitProps<T>(data.nonprofitProps as T);
        }
        this.lastUpdated = data.lastUpdated;
    }
}

// Base type for form fields that always includes formDescription
export type BaseFormFields = {
    formDescription: string | null;
    [key: string]: string | null;
};

export type FundraiserFormFields = BaseFormFields & {
    formImageUrl: string | null;
};

// Generic base class for managing key-value pairs
export class PropertyManager<T> {
    protected properties: Map<keyof T, T[keyof T] | null>;

    constructor() {
        this.properties = new Map<keyof T, T[keyof T] | null>();
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

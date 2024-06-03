import { BaseFormFields } from '../types/index.js';
import { PropertyManager } from './PropertyManager.js';

export class FormField<T extends BaseFormFields> extends PropertyManager<T> {
    constructor() {
        super();
    }
}
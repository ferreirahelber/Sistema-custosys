import { RecipeItem } from '../types';

export interface RecipeFormState {
    name: string;
    barcode: string;
    category: string;
    isBase: boolean;
    yieldUnits: number;
    yieldQuantity: number;
    yieldUnit: 'g' | 'ml' | 'un';
    prepTime: number;
    prepMethod: string;
    recipeItems: RecipeItem[];
    currentSellingPrice: number;

    // UI/Sync States
    selectedIngId: string;
    selectedUnit: string;
    itemQuantity: string;
    baseQuantity: string;
    draftLoaded: boolean;
}

export const initialRecipeFormState: RecipeFormState = {
    name: '',
    barcode: '',
    category: '',
    isBase: false,
    yieldUnits: 1,
    yieldQuantity: 1,
    yieldUnit: 'un',
    prepTime: 60,
    prepMethod: '',
    recipeItems: [],
    currentSellingPrice: 0,

    selectedIngId: '',
    selectedUnit: '',
    itemQuantity: '',
    baseQuantity: '',
    draftLoaded: false
};

export type SetFieldAction = {
    [K in keyof RecipeFormState]: { type: 'SET_FIELD'; field: K; value: RecipeFormState[K] }
}[keyof RecipeFormState];

export type RecipeFormAction =
    | SetFieldAction
    | { type: 'SET_MULTIPLE_FIELDS'; fields: Partial<RecipeFormState> }
    | { type: 'ADD_ITEM'; item: RecipeItem; clearInputs?: boolean }
    | { type: 'REMOVE_ITEM'; id: string }
    | { type: 'LOAD_DATA'; data: Partial<RecipeFormState>; isDraft?: boolean }
    | { type: 'RESET_FORM' };

export const recipeFormReducer = (state: RecipeFormState, action: RecipeFormAction): RecipeFormState => {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.value };

        case 'SET_MULTIPLE_FIELDS':
            return { ...state, ...action.fields };

        case 'ADD_ITEM':
            const newState = {
                ...state,
                recipeItems: [...state.recipeItems, action.item]
            };

            if (action.clearInputs) {
                return {
                    ...newState,
                    selectedIngId: '',
                    itemQuantity: '',
                    baseQuantity: '',
                    selectedUnit: ''
                };
            }
            return newState;

        case 'REMOVE_ITEM':
            return {
                ...state,
                recipeItems: state.recipeItems.filter(i => i.id !== action.id)
            };

        case 'LOAD_DATA':
            return {
                ...state,
                ...action.data,
                draftLoaded: action.isDraft || state.draftLoaded
            };

        case 'RESET_FORM':
            return initialRecipeFormState;

        default:
            return state;
    }
};

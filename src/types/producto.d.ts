export interface Producto {
    id: number;
    name: string;
    price: number;
    image: string;
    description: string;
    color: string;
    category: string;
    stock: number;
    recommended: boolean;
    variants: string[];
    storage: string[];
    specs: {
        processor?: string;
        ram?: string;
        display?: string;
        camera?: string;
        color?: string;
        image?: string;
        battery?: string;
        connectivity?: string;
        os?: string;
    };
    configurations: ProductConfiguration[];
}

export interface ProductConfiguration {
    id: string;
    variant: string;
    storage: string;
    ram?: string;
    price: number;
    stock: number;
    specs: {
        processor?: string;
        ram?: string;
        display?: string;
        camera?: string;
        image?: string;
        color?: string;
        battery?: string;
        connectivity?: string;
        os?: string;
    };
}

export interface CartItem {
    product: Producto;
    configuration: ProductConfiguration;
    quantity: number;
}


export interface Customer {
    id: string;
    name: string;
    email: string;
}

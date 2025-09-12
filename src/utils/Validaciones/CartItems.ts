import { z } from "zod";
import type { CartItem } from "../../types/producto";
// Schema del producto
export const ProductoSchema = z.object({
    activo: z.number(),
    almacenamiento: z.string(),
    bateria: z.string(),
    camara: z.string(),
    categoria: z.string(),
    color: z.string(),
    conectividad: z.string(),
    created_at: z.string(),
    descripcion: z.string(),
    display: z.string(),
    id: z.number(),
    imagen_url: z.string().url(), // asumo que es url
    marca: z.string(),
    precio_base: z.string(),
    procesador: z.string(),
    producto: z.string(),
    producto_id: z.number(),
    ram_especificacion: z.string(),
    ram_variante: z.string(),
    recomendado: z.number(),
    sistema_operativo: z.string(),
    sku: z.string(),
    stock: z.number(),
});

// Schema de un CartItem
export const CartItemSchema = z.object({
    product: ProductoSchema,
    quantity: z.number().min(1).max(100)
});

// Schema de un arreglo de CartItems
export const CartItemsSchema = z.array(CartItemSchema);

// Clase con validador
export class CartItemsValidation {
    static RevisarItems(items: Partial<CartItem>[]) {
        return CartItemsSchema.safeParse(items);
    }
}

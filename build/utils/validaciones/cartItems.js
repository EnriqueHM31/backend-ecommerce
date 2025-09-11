"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartItemsValidation = exports.CartItemsSchema = exports.CartItemSchema = exports.ProductoSchema = void 0;
const zod_1 = require("zod");
// Schema del producto
exports.ProductoSchema = zod_1.z.object({
    activo: zod_1.z.number(),
    almacenamiento: zod_1.z.string(),
    bateria: zod_1.z.string(),
    camara: zod_1.z.string(),
    categoria: zod_1.z.string(),
    color: zod_1.z.string(),
    conectividad: zod_1.z.string(),
    created_at: zod_1.z.string(),
    descripcion: zod_1.z.string(),
    display: zod_1.z.string(),
    id: zod_1.z.number(),
    imagen_url: zod_1.z.string().url(), // asumo que es url
    marca: zod_1.z.string(),
    precio_base: zod_1.z.string(),
    procesador: zod_1.z.string(),
    producto: zod_1.z.string(),
    producto_id: zod_1.z.number(),
    ram_especificacion: zod_1.z.string(),
    ram_variante: zod_1.z.string(),
    recomendado: zod_1.z.number(),
    sistema_operativo: zod_1.z.string(),
    sku: zod_1.z.string(),
    stock: zod_1.z.number(),
    updated_at: zod_1.z.string()
});
// Schema de un CartItem
exports.CartItemSchema = zod_1.z.object({
    product: exports.ProductoSchema,
    quantity: zod_1.z.number().min(1).max(100)
});
// Schema de un arreglo de CartItems
exports.CartItemsSchema = zod_1.z.array(exports.CartItemSchema);
// Clase con validador
class CartItemsValidation {
    static RevisarItems(items) {
        return exports.CartItemsSchema.safeParse(items);
    }
}
exports.CartItemsValidation = CartItemsValidation;

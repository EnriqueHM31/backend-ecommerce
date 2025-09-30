
import { supabase } from "@/database/db";
export class ModeloCreateProductos {
    static async createProductos(
        sku: string,
        producto: string,
        productos_base_id: number,
        variante_id: number,
        color_id: number,
        almacenamiento_id: number,
        ram_id: number,
        stock: number,
        imagen_url: string,
        precio: number
    ) {
        try {
            // 1️⃣ Verificar si el SKU ya existe
            const { data: existing, error: checkError } = await supabase
                .from('productos_sku')
                .select('id')
                .eq('sku', sku)
                .single(); // single() retorna null si no existe

            if (checkError) {
                return { success: false, message: checkError.message };
            }

            if (existing) {
                return { success: false, message: `Ese producto con esas caracteristicas ya existe` };
            }

            // 2️⃣ Insertar nuevo producto
            const { data: productos, error } = await supabase
                .from('productos_sku')
                .insert([{
                    sku,
                    producto,
                    productos_base_id,
                    variante_id,
                    color_id,
                    almacenamiento_id,
                    ram_id,
                    stock,
                    imagen_url,
                    precio
                }])
                .select('*');

            if (error) {
                return { success: false, productos, message: error.message };
            }

            return { success: true, data: productos, message: 'Producto creado correctamente' };
        } catch (error) {
            return { success: false, message: (error as Error).message };
        }
    }

}   
import { db } from '../database/db';

export class ModeloProductos {
    static async ListarProductos() {

        console.log("Listar productos");
        const connection = await db.getConnection();
        try {
            const [resultProductos] = await connection.query(`
                SELECT 
    sku.id as id,                                    -- ID único para cada producto individual
    pb.id as producto_id,                            -- Para agrupación en el adapter
    sku.sku,                                         -- SKU único
    v.nombre_variante as producto,                   -- Nombre del producto
    pb.descripcion,
    cat.nombre as categoria,
    pb.marca,
    col.nombre as color,
    alm.capacidad as almacenamiento,
    ram.capacidad as ram_variante,
    v.procesador as ram_especificacion,
    v.procesador,
    v.display,
    v.camara,
    v.bateria,
    v.conectividad,
    v.sistema_operativo,
    sku.precio_base,
    sku.stock,
    sku.imagen_url,
    v.recomendado,
    sku.activo,
    sku.created_at,
    sku.updated_at
FROM productos_sku sku
INNER JOIN productos_base pb ON sku.producto_base_id = pb.id
INNER JOIN variantes v ON sku.variante_id = v.id
INNER JOIN categorias cat ON pb.categoria_id = cat.id
INNER JOIN colores col ON sku.color_id = col.id
INNER JOIN almacenamientos alm ON sku.almacenamiento_id = alm.id
INNER JOIN ram_specs ram ON sku.ram_id = ram.id
WHERE sku.activo = TRUE AND pb.activo = TRUE AND v.activa = TRUE
ORDER BY pb.nombre, v.nombre_variante, col.nombre, alm.capacidad;
                `);


            if (!resultProductos) throw new Error('Error obteniendo productos');

            return { success: true, message: "productos obtenidas correctamente", data: resultProductos };
        } catch (error) {
            return { success: false, message: error || "Error al obtener las productos", data: {} };
        } finally {
            connection.release();
        }
    }
}
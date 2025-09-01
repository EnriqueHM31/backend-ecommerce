import { db } from '../database/db';

export class ModeloProductos {
    static async ListarProductos() {

        const connection = await db.getConnection();
        try {
            const [resultProductos] = await connection.query(`
                SELECT 
                    p.producto_id,
                    p.nombre AS producto,
                    c.nombre_categoria AS categoria,
                    p.precio_base,
                    p.descripcion,
                    pv.variante_id,
                    pv.color,
                    pv.almacenamiento,
                    pv.ram AS ram_variante,
                    pv.sistema_operativo,
                    pv.sku,
                    pv.imagen_url,
                    s.cantidad AS stock,
                    CASE 
                        WHEN s.cantidad <= s.stock_minimo THEN 'Stock Bajo'
                        WHEN s.cantidad > 20 THEN 'Stock Alto'
                        ELSE 'Stock Normal'
                    END AS estado_stock,
                    p.recomendado,
                    e.procesador,
                    e.ram AS ram_especificacion,
                    e.display,
                    e.camara,
                    e.sistema,
                    e.conectividad,
                    e.bateria
                FROM Producto p
                LEFT JOIN categorias c ON p.categoria_id = c.categoria_id
                LEFT JOIN producto_variantes pv ON p.producto_id = pv.producto_id
                LEFT JOIN stock s ON pv.variante_id = s.variante_id
                LEFT JOIN especificaciones e ON p.producto_id = e.producto_id
                WHERE p.activo = TRUE 
                  AND (pv.disponible = TRUE OR pv.disponible IS NULL)
                ORDER BY p.producto_id, p.nombre, pv.color, pv.almacenamiento;
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
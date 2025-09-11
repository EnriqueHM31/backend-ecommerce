"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModeloProductos = void 0;
const db_1 = require("../database/db");
class ModeloProductos {
    static ListarProductos() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Listar productos");
            const connection = yield db_1.db.getConnection();
            try {
                const [resultProductos] = yield connection.query(`
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
                if (!resultProductos)
                    throw new Error('Error obteniendo productos');
                return { success: true, message: "productos obtenidas correctamente", data: resultProductos };
            }
            catch (error) {
                return { success: false, message: error || "Error al obtener las productos", data: {} };
            }
            finally {
                connection.release();
            }
        });
    }
}
exports.ModeloProductos = ModeloProductos;

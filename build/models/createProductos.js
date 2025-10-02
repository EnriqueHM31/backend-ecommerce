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
exports.ModeloCreateProductos = void 0;
const db_1 = require("../database/db");
class ModeloCreateProductos {
    static createProductos(sku, producto_base_id, variante_id, color_id, almacenamiento_id, ram_id, stock, imagen_url, precio) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data: existing, error: checkError } = yield db_1.supabase
                    .from('productos_sku')
                    .select('id')
                    .eq('sku', sku)
                    .maybeSingle();
                if (checkError) {
                    return { success: false, message: checkError.message };
                }
                if (existing) {
                    return { success: false, message: `Ese producto con esas caracteristicas ya existe` };
                }
                // 2️⃣ Insertar nuevo producto
                const { data: productos, error } = yield db_1.supabase
                    .from('productos_sku')
                    .insert([
                        {
                            sku,
                            producto_base_id,
                            variante_id,
                            color_id,
                            almacenamiento_id,
                            ram_id,
                            stock,
                            imagen_url,
                            precio,
                        },
                    ])
                    .select(`
    id,
    sku,
    precio,
    stock,
    imagen_url,
    productos_base (
      id,
      nombre,
      descripcion,
      marca,
      categorias (
        nombre
      )
    ),
    variantes (
      id,
      nombre_variante,
      procesador,
      display,
      camara,
      bateria,
      conectividad,
      sistema_operativo
    ),
    colores (
      nombre
    ),
    almacenamientos (
      capacidad
    ),
    especificaciones_ram (
      capacidad,
      tipo
    )
  `)
                    .single(); // 👈 trae solo el recién insertado
                if (error) {
                    return { success: false, productos, message: error.message };
                }
                return { success: true, data: productos, message: 'Producto creado correctamente' };
            }
            catch (error) {
                return { success: false, message: error.message };
            }
        });
    }
    static deleteProductosSku(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 1️⃣ Obtener el producto por id
                const { data: producto, error: fetchError } = yield db_1.supabase
                    .from('productos_sku')
                    .select('id, active')
                    .eq('id', id)
                    .single(); // obtener solo un registro
                if (fetchError) {
                    return { success: false, message: fetchError.message };
                }
                if (!producto) {
                    return { success: false, message: 'Producto no encontrado' };
                }
                // 2️⃣ Cambiar el valor de active al contrario
                const nuevoEstado = !producto.active;
                // 3️⃣ Actualizar el registro
                const { data: updated, error: updateError } = yield db_1.supabase
                    .from('productos_sku')
                    .update({ active: nuevoEstado })
                    .eq('id', id)
                    .select('id, active');
                if (updateError)
                    throw updateError;
                return { success: true, data: updated, message: 'Producto actualizado correctamente' };
            }
            catch (error) {
                console.error('Error al cambiar estado del producto:', error);
                throw error;
            }
        });
    }
}
exports.ModeloCreateProductos = ModeloCreateProductos;

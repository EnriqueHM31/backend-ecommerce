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
            console.log('Listar productos');
            try {
                const { data: productos, error } = yield db_1.supabase
                    .from('productos_sku')
                    .select(`
              id,
              sku,
              precio,
              stock,
              imagen_url,
              active,
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
            `);
                if (error)
                    throw error;
                return {
                    success: true,
                    message: 'Productos obtenidos correctamente',
                    data: productos
                };
            }
            catch (error) {
                console.error('Error al obtener productos:', error);
                return {
                    success: false,
                    message: error.message || 'Error al obtener los productos',
                    data: []
                };
            }
        });
    }
    static topProductos() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Listar top 5 productos más vendidos');
            try {
                // Llamamos a la función SQL
                const { data: topIds, error: errorTop } = yield db_1.supabase
                    .rpc('top_productos');
                if (errorTop)
                    throw errorTop;
                if (!topIds || topIds.length === 0)
                    return { success: true, message: 'No hay productos vendidos', data: [] };
                console.log({ topIds });
                const productoIds = topIds.map((p) => p.producto_id);
                // Traer todos los datos de esos productos
                const { data: productos, error: errorProductos } = yield db_1.supabase
                    .from('productos_sku')
                    .select(`
        id,
        sku,
        stock,
        imagen_url,
        active,
        precio,
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
                    .in('id', productoIds)
                    .eq('active', true);
                if (errorProductos)
                    throw errorProductos;
                // Unir total_vendido
                const productosConTotal = productos.map((p) => {
                    var _a;
                    const total_vendido = ((_a = topIds.find((t) => t.producto_id === p.id)) === null || _a === void 0 ? void 0 : _a.total_vendido) || 0;
                    return Object.assign(Object.assign({}, p), { total_vendido });
                });
                return {
                    success: true,
                    message: 'Top 5 productos más vendidos obtenidos correctamente',
                    data: productosConTotal
                };
            }
            catch (error) {
                console.error('Error al obtener productos:', error);
                return {
                    success: false,
                    message: error.message || 'Error al obtener los productos',
                    data: []
                };
            }
        });
    }
    static ListarProductosActivos() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Listar productos activos');
            try {
                const { data: productos, error } = yield db_1.supabase
                    .from('productos_sku')
                    .select(`
              id,
              sku,
              precio,
              stock,
              imagen_url,
              active,
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
                    .eq('active', true);
                if (error)
                    throw error;
                return {
                    success: true,
                    message: 'Productos obtenidos correctamente',
                    data: productos
                };
            }
            catch (error) {
                console.error('Error al obtener productos:', error);
                return {
                    success: false,
                    message: error.message || 'Error al obtener los productos',
                    data: []
                };
            }
        });
    }
}
exports.ModeloProductos = ModeloProductos;

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
exports.PedidosModel = void 0;
const Stripe_1 = require("../constants/Stripe");
const db_1 = require("../database/db");
const compras_1 = require("../utils/consultas/compras");
class PedidosModel {
    /**
     * Crea un nuevo pedido con validaciones de stock y usuario
     */
    static crearPedido(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
            const { checkout_session_id } = data;
            const stripe = (0, Stripe_1.obtenerStripe)();
            try {
                // 1. Verificar si ya existe pedido para esa sesión
                const { data: pedidoExistente, error: errorBuscar } = yield db_1.supabase
                    .from('pedidos')
                    .select('id')
                    .eq('id', checkout_session_id)
                    .single();
                if (pedidoExistente && !errorBuscar) {
                    return {
                        success: true,
                        message: 'Pedido ya existía, no se duplicó',
                        data: { pedido_id: pedidoExistente.id }
                    };
                }
                const session = yield stripe.checkout.sessions.retrieve(checkout_session_id, {
                    expand: ['line_items', 'customer']
                });
                const line_items = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.carrito;
                // 2. Verificar usuario
                const { data: usuario, error: errorUsuario } = yield db_1.supabase
                    .from('usuarios')
                    .select('id_usuario')
                    .eq('id_usuario', (_b = session.metadata) === null || _b === void 0 ? void 0 : _b.customer_id)
                    .single();
                if (errorUsuario || !usuario) {
                    return {
                        success: false,
                        message: 'Usuario no encontrado'
                    };
                }
                console.log({ hola: JSON.parse(line_items !== null && line_items !== void 0 ? line_items : '[]') });
                // 3. Obtener todos los productos de una sola vez
                const productIds = JSON.parse(line_items !== null && line_items !== void 0 ? line_items : '[]').map((i) => i.producto_id);
                console.log({ productIds });
                const { data: productosDB, error: errorProductosDB } = yield db_1.supabase
                    .from('productos_sku')
                    .select('id, sku, precio, stock')
                    .in('id', productIds);
                if (errorProductosDB || !productosDB) {
                    return {
                        success: false,
                        message: 'Error al obtener productos'
                    };
                }
                console.log({ productosDB });
                // 4. Validar stock y preparar items
                const { total, itemsProcesados, error: errorValidacion } = yield this.validarStockYPrepararItems(JSON.parse(line_items !== null && line_items !== void 0 ? line_items : '[]'), productosDB);
                if (errorValidacion) {
                    return {
                        success: false,
                        message: errorValidacion
                    };
                }
                console.log({ itemsProcesados });
                console.log({ total });
                const line1 = (_d = (_c = session.customer_details) === null || _c === void 0 ? void 0 : _c.address) === null || _d === void 0 ? void 0 : _d.line1;
                const line2 = (_f = (_e = session.customer_details) === null || _e === void 0 ? void 0 : _e.address) === null || _f === void 0 ? void 0 : _f.line2;
                const city = (_h = (_g = session.customer_details) === null || _g === void 0 ? void 0 : _g.address) === null || _h === void 0 ? void 0 : _h.city;
                const state = (_k = (_j = session.customer_details) === null || _j === void 0 ? void 0 : _j.address) === null || _k === void 0 ? void 0 : _k.state;
                const postal_code = (_m = (_l = session.customer_details) === null || _l === void 0 ? void 0 : _l.address) === null || _m === void 0 ? void 0 : _m.postal_code;
                const country = (_p = (_o = session.customer_details) === null || _o === void 0 ? void 0 : _o.address) === null || _p === void 0 ? void 0 : _p.country;
                const user_id = (_q = session.metadata) === null || _q === void 0 ? void 0 : _q.customer_id;
                if (!line1 || !line2 || !city || !state || !postal_code || !country || !user_id) {
                    return {
                        success: false,
                        message: 'Error al obtener datos de cliente'
                    };
                }
                // 5. Insertar el domicilio
                const { data: domicilio_id } = yield this.InsertarDomicilio(line1, line2, city, state, postal_code, country, user_id);
                console.log({ domicilio_id });
                // 5. Crear el pedido principal
                const { data: pedido, error: errorPedido } = yield db_1.supabase
                    .from('pedidos')
                    .insert([
                    {
                        id: checkout_session_id,
                        usuario_id: user_id,
                        direccion_envio_id: domicilio_id,
                        total,
                    }
                ])
                    .select('id')
                    .single();
                if (errorPedido)
                    throw errorPedido;
                const pedido_id = pedido.id;
                console.log({ pedido });
                // 6. Insertar items
                const { error: errorItems } = yield db_1.supabase.from('pedido_items').insert(itemsProcesados.map(item => ({
                    pedido_id,
                    producto_id: item.producto_id,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio_unitario,
                    subtotal: item.subtotal
                })));
                if (errorItems)
                    throw errorItems;
                // 7. Disminuir stock de cada producto
                yield this.actualizarStockProductos(itemsProcesados);
                return {
                    success: true,
                    message: 'Pedido creado exitosamente',
                    data: {
                        pedido_id,
                        total: total.toFixed(2),
                        items_count: itemsProcesados.length,
                        estado: 'pendiente'
                    }
                };
            }
            catch (error) {
                console.error('Error al crear pedido:', error);
                return {
                    success: false,
                    message: 'Error interno del servidor'
                };
            }
        });
    }
    /**
     * Valida stock y prepara los items del pedido
     */
    static validarStockYPrepararItems(cart_items, productosDB) {
        return __awaiter(this, void 0, void 0, function* () {
            let total = 0;
            const itemsProcesados = [];
            for (const item of cart_items) {
                const producto_db = productosDB.find(p => p.id === item.producto_id);
                if (!producto_db) {
                    return { total: 0, itemsProcesados: [], error: `Producto no válido: ${item.producto_id}` };
                }
                const cantidad = item.cantidad;
                // Verificación de stock
                if (cantidad > producto_db.stock) {
                    return {
                        total: 0,
                        itemsProcesados: [],
                        error: `Stock insuficiente para ${producto_db.sku}. Disponible: ${producto_db.stock}, Solicitado: ${cantidad}`
                    };
                }
                const precio_unitario = parseFloat(Number(producto_db.precio).toFixed(2));
                const subtotal = precio_unitario * cantidad;
                total += subtotal;
                itemsProcesados.push({
                    producto_id: producto_db.id,
                    cantidad: cantidad,
                    precio_unitario,
                    subtotal,
                });
            }
            return { total, itemsProcesados };
        });
    }
    static InsertarDomicilio(line1, line2, city, state, postal_code, country, usuario_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data, error } = yield db_1.supabase
                .from('direcciones')
                .insert([{
                    usuario_id,
                    direccion_1: line1,
                    direccion_2: line2,
                    ciudad: city,
                    estado: state,
                    codigo_postal: postal_code,
                    pais: country
                }])
                .select('id_direccion')
                .single();
            if (error)
                throw error;
            if (!data)
                throw new Error('Error al insertar domicilio: resultado vacío');
            return { success: true, message: 'Domicilio creado exitosamente', data: data.id_direccion };
        });
    }
    /**
     * Actualiza el stock de los productos después de crear el pedido
     */
    static actualizarStockProductos(itemsProcesados) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all(itemsProcesados.map((i) => __awaiter(this, void 0, void 0, function* () {
                // Obtener stock actual
                const { data: producto, error: err } = yield db_1.supabase
                    .from('productos_sku')
                    .select('stock')
                    .eq('id', i.producto_id)
                    .single();
                if (err || !producto) {
                    console.error(`No se pudo actualizar stock para ${i.producto_id}`);
                    return;
                }
                // Restar cantidad
                const nuevoStock = producto.stock - i.cantidad;
                const { error: stockError } = yield db_1.supabase
                    .from('productos_sku')
                    .update({ stock: nuevoStock })
                    .eq('id', i.producto_id);
                if (stockError)
                    console.error(`Error al actualizar stock producto ${i.producto_id}:`, stockError);
            })));
        });
    }
    /**
     * Obtiene pedidos por ID de usuario
     */
    static obtenerPedidosPorUsuario(user_id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { pedidos } = yield (0, compras_1.obtenerCompras)(user_id);
                return {
                    success: true,
                    message: 'Pedidos obtenidos correctamente',
                    data: pedidos
                };
            }
            catch (error) {
                console.error('Error al obtener pedidos del usuario:', error);
                return {
                    success: false,
                    message: 'Error al obtener pedidos'
                };
            }
        });
    }
    /**
     * Actualiza el estado de un pedido
     */
    static actualizarEstadoPedido(pedido_id, nuevo_estado) {
        return __awaiter(this, void 0, void 0, function* () {
            const estados_validos = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];
            try {
                // Validación de estado
                if (!nuevo_estado || !estados_validos.includes(nuevo_estado)) {
                    return {
                        success: false,
                        message: 'Estado no válido',
                        data: { estados_validos }
                    };
                }
                // 1. Obtener estado actual del pedido
                const { data: pedido, error: errorPedido } = yield db_1.supabase
                    .from('pedidos')
                    .select('estado')
                    .eq('id', pedido_id)
                    .single();
                if (errorPedido || !pedido) {
                    return {
                        success: false,
                        message: 'Pedido no encontrado'
                    };
                }
                const estado_actual = pedido.estado;
                // 2. Si pasa de pendiente → confirmado, reducir stock
                if (estado_actual === 'pendiente' && nuevo_estado === 'confirmado') {
                    yield (0, compras_1.disminuirStock)(pedido_id);
                }
                // 3. Si pasa de confirmado → cancelado, restaurar stock
                if (estado_actual === 'confirmado' && nuevo_estado === 'cancelado') {
                    yield (0, compras_1.restaurarStock)(pedido_id);
                }
                // 4. Actualizar estado del pedido
                const { error: errorUpdate } = yield db_1.supabase
                    .from('pedidos')
                    .update({ estado: nuevo_estado })
                    .eq('id', pedido_id);
                if (errorUpdate)
                    throw errorUpdate;
                return {
                    success: true,
                    message: `Estado del pedido actualizado a: ${nuevo_estado}`,
                    data: {
                        pedido_id,
                        estado_anterior: estado_actual,
                        estado_nuevo: nuevo_estado
                    }
                };
            }
            catch (error) {
                console.error('Error al actualizar estado:', error);
                return {
                    success: false,
                    message: 'Error interno del servidor'
                };
            }
        });
    }
    static obtenerTodosLosPedidos() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data, error } = yield db_1.supabase
                    .from("pedidos")
                    .select(`
              id,
              fecha_pedido,
              estado,
              total,
              direcciones (
                  direccion_1,
                  direccion_2,
                  ciudad,
                  estado,
                  codigo_postal,
                  pais
              ),
              pedido_items (
                  id,
                  producto_id,
                  cantidad,
                  precio_unitario,
                  subtotal
              ),
              usuarios (
                  id_usuario,
                  nombre,
                  correo
              )
            `);
                console.log({ data });
                const pedidosConHoraLocal = data === null || data === void 0 ? void 0 : data.map(pedido => (Object.assign(Object.assign({}, pedido), { fecha_pedido: new Date(pedido.fecha_pedido + 'Z').toLocaleString('es-MX', {
                        timeZone: 'America/Mexico_City'
                    }) })));
                if (error)
                    throw error;
                return { success: true, data: pedidosConHoraLocal, message: "Pedidos obtenidos con éxito" };
            }
            catch (error) {
                return { success: false, message: error.message };
            }
        });
    }
    static updateEstadoPedido(pedido_id, nuevo_estado) {
        return __awaiter(this, void 0, void 0, function* () {
            const estados_validos = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];
            try {
                // Validación de estado
                if (!nuevo_estado || !estados_validos.includes(nuevo_estado)) {
                    return {
                        success: false,
                        message: 'Estado no válido',
                        data: { estados_validos }
                    };
                }
                // 1. Obtener estado actual del pedido
                const { data: pedido, error: errorPedido } = yield db_1.supabase
                    .from('pedidos')
                    .select('estado')
                    .eq('id', pedido_id)
                    .single();
                if (errorPedido || !pedido) {
                    return {
                        success: false,
                        message: 'Pedido no encontrado'
                    };
                }
                const estado_actual = pedido.estado;
                // 4. Actualizar estado del pedido
                const { error: errorUpdate } = yield db_1.supabase
                    .from('pedidos')
                    .update({ estado: nuevo_estado })
                    .eq('id', pedido_id);
                if (errorUpdate)
                    throw errorUpdate;
                return {
                    success: true,
                    message: `Estado del pedido actualizado a: ${nuevo_estado}`,
                    data: {
                        pedido_id,
                        estado_anterior: estado_actual,
                        estado_nuevo: nuevo_estado
                    }
                };
            }
            catch (error) {
                console.error('Error al actualizar estado:', error);
                return {
                    success: false,
                    message: 'Error interno del servidor'
                };
            }
        });
    }
}
exports.PedidosModel = PedidosModel;

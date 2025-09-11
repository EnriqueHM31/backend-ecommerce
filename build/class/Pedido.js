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
exports.PedidosService = void 0;
const db_1 = require("../database/db");
class PedidosService {
    static crearPedido(user_id_1, cart_items_1) {
        return __awaiter(this, arguments, void 0, function* (user_id, cart_items, referencias = '') {
            const connection = yield db_1.db.getConnection();
            // Validar datos requeridos
            if (!user_id || !cart_items) {
                throw new Error('Faltan datos requeridos: user_id, cart_items, direccion_envio');
            }
            // Validar que cart_items sea un array y no esté vacío
            if (!Array.isArray(cart_items) || cart_items.length === 0) {
                throw new Error('El carrito está vacío o no es válido');
            }
            try {
                yield connection.beginTransaction();
                // 1. Verificar que el usuario existe
                const [userCheck] = yield connection.execute('SELECT id FROM customer WHERE id = ?', [user_id]);
                console.log({ userCheck });
                if (!userCheck) {
                    throw new Error('Usuario no encontrado');
                }
                // 2. Validar productos y calcular total
                let total = 0;
                const items_procesados = [];
                for (const item of cart_items) {
                    // Validar estructura del item
                    if (!item.product || !item.quantity) {
                        throw new Error('Estructura de item inválida');
                    }
                    const product = item.product;
                    const quantity = item.quantity;
                    if (quantity <= 0) {
                        throw new Error('La cantidad debe ser mayor a 0');
                    }
                    // Verificar que el producto existe y obtener datos actuales
                    const [productCheck] = yield connection.execute(`
                    SELECT id, precio_base, stock, activo 
                    FROM productos_sku 
                    WHERE id = ? AND activo = 1
                `, [product.id]);
                    if (!productCheck) {
                        throw new Error(`Producto no encontrado o inactivo: ${product.producto}`);
                    }
                    const producto_db = productCheck[0];
                    // Verificar stock disponible (para pedido pendiente_pago no reducimos aún)
                    if (producto_db.stock < quantity) {
                        throw new Error(`Stock insuficiente para ${producto_db.producto}. Disponible: ${producto_db.stock}, Solicitado: ${quantity}`);
                    }
                    const precio_unitario = parseFloat(Number(producto_db.precio_base).toFixed(2));
                    const subtotal = precio_unitario * quantity;
                    total += subtotal;
                    items_procesados.push({
                        producto_id: product.id,
                        cantidad: quantity,
                        precio_unitario: precio_unitario,
                        subtotal: subtotal,
                    });
                }
                // 3. Crear el pedido principal en estado pendiente_pago
                const pedidoResult = yield connection.execute(`
                INSERT INTO pedidos (usuario_id, total, direccion_envio, referencias)
                VALUES (?, ?, ?, ?)
            `, [user_id, total.toFixed(2), "hola", referencias]);
                if (!pedidoResult)
                    throw new Error("Error al crear el pedido 34");
                // 4. Insertar items del pedido
                for (const item of items_procesados) {
                    yield connection.execute(`
                    INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
                    VALUES (?, ?, ?, ?, ?)
                `, [
                        pedidoResult[0].insertId,
                        item.producto_id,
                        item.cantidad,
                        item.precio_unitario,
                        item.subtotal
                    ]);
                }
                yield connection.commit();
                // Retornar datos del pedido creado
                return {
                    success: true,
                    pedido_id: pedidoResult[0].insertId,
                    total: parseFloat(total.toFixed(2)),
                    items_count: items_procesados.length,
                    estado: 'pendiente_pago',
                    items: items_procesados,
                    referencias
                };
            }
            catch (error) {
                yield connection.rollback();
                console.log(error);
                throw error; // Relanzar el error para que lo maneje quien llama
            }
        });
    }
    static confirmarPedido(pedido_id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield db_1.db.beginTransaction();
                // Verificar que el pedido existe y está en estado pendiente_pago
                const [pedidoCheck] = yield db_1.db.execute('SELECT id, estado, total FROM pedidos WHERE id = ? AND estado = "pendiente_pago"', [pedido_id]);
                if (pedidoCheck) {
                    throw new Error('Pedido no encontrado o ya procesado');
                }
                // Verificar stock nuevamente antes de confirmar
                const [stockCheck] = yield db_1.db.execute(`
                SELECT 
                    pi.producto_id,
                    pi.cantidad,
                    ps.stock,
                    ps.producto,
                    (ps.stock >= pi.cantidad) as stock_suficiente
                FROM pedido_items pi
                JOIN productos_sku ps ON pi.producto_id = ps.id
                WHERE pi.pedido_id = ?
            `, [pedido_id]);
                // Verificar que todos los productos tengan stock suficiente
                for (const item of stockCheck) {
                    if (!item.stock_suficiente) {
                        throw new Error(`Stock insuficiente para ${item.producto}. Disponible: ${item.stock}, Necesario: ${item.cantidad}`);
                    }
                }
                // Reducir stock de todos los productos
                yield db_1.db.execute(`
                UPDATE productos_sku ps
                JOIN pedido_items pi ON ps.id = pi.producto_id
                SET ps.stock = ps.stock - pi.cantidad
                WHERE pi.pedido_id = ?
            `, [pedido_id]);
                // Actualizar estado del pedido a confirmado
                yield db_1.db.execute('UPDATE pedidos SET estado = "confirmado" WHERE id = ?', [pedido_id]);
                yield db_1.db.commit();
                return {
                    success: true,
                    pedido_id: pedido_id,
                    estado: 'confirmado',
                    message: 'Pedido confirmado y stock actualizado'
                };
            }
            catch (error) {
                yield db_1.db.rollback();
                throw error;
            }
        });
    }
    static cancelarPedido(_a) {
        return __awaiter(this, arguments, void 0, function* ({ pedido_id, motivo = 'pago_fallido' }) {
            try {
                const estados_cancelables = ['pendiente_pago', 'pago_fallido'];
                const nuevo_estado = motivo === 'timeout' ? 'cancelado' : 'pago_fallido';
                const [result] = yield db_1.db.execute('UPDATE pedidos SET estado = ? WHERE id = ? AND estado IN (?, ?)', [nuevo_estado, pedido_id, ...estados_cancelables]);
                if (result) {
                    throw new Error('Pedido no encontrado o no se puede cancelar');
                }
                return {
                    success: true,
                    pedido_id: pedido_id,
                    estado: nuevo_estado,
                    message: `Pedido cancelado por: ${motivo}`
                };
            }
            catch (error) {
                throw error;
            }
        });
    }
    static obtenerPedido(pedido_id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Obtener información del pedido
                const [pedidoData] = yield db_1.db.execute(`
                SELECT 
                    p.id,
                    p.usuario_id,
                    p.fecha_pedido,
                    p.estado,
                    p.total,
                    p.direccion_envio,
                    p.referencias,
                    c.name as cliente_nombre,
                    c.email as cliente_email
                FROM pedidos p
                JOIN customer c ON p.usuario_id = c.id
                WHERE p.id = ?
            `, [pedido_id]);
                if (pedidoData) {
                    throw new Error('Pedido no encontrado');
                }
                // Obtener items del pedido
                const [items] = yield db_1.db.execute(`
                SELECT 
                    pi.id,
                    pi.cantidad,
                    pi.precio_unitario,
                    pi.subtotal,
                    ps.producto as nombre_producto,
                    ps.descripcion,
                    ps.imagen_url,
                    ps.marca,
                    ps.sku
                FROM pedido_items pi
                JOIN productos_sku ps ON pi.producto_id = ps.id
                WHERE pi.pedido_id = ?
            `, [pedido_id]);
                return {
                    success: true,
                    pedido: pedidoData[0],
                    items: items
                };
            }
            catch (error) {
                throw error;
            }
        });
    }
    static limpiarPedidosExpirados() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [result] = yield db_1.db.execute(`
                UPDATE pedidos 
                SET estado = 'cancelado'
                WHERE estado = 'pendiente_pago' 
                AND fecha_pedido < DATE_SUB(NOW(), INTERVAL 30 MINUTE)
            `);
                return {
                    success: true,
                    pedidos_cancelados: result,
                    message: `${result} pedidos expirados cancelados`
                };
            }
            catch (error) {
                throw error;
            }
        });
    }
}
exports.PedidosService = PedidosService;

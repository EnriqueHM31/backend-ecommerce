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
exports.pedidosController = void 0;
const compras_1 = require("../utils/consultas/compras");
const Usuario_1 = require("../utils/consultas/Usuario");
const cartItems_1 = require("../utils/validaciones/cartItems");
const db_1 = require("../database/db");
const usuario_1 = require("../utils/validaciones/usuario");
class pedidosController {
    static crearPedido(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { user_id, cart_items, direccion_envio = '', referencias = '' } = req.body;
            const resultadoValidarCartItems = cartItems_1.CartItemsValidation.RevisarItems(cart_items);
            if (!resultadoValidarCartItems.success) {
                res.status(400).json({ success: false, error: resultadoValidarCartItems.error.message });
                return;
            }
            const resultadoValidarUsuario = usuario_1.UsuarioValidation.RevisarUsuario(user_id);
            if (!resultadoValidarUsuario.success) {
                res.status(400).json({ success: false, error: resultadoValidarUsuario.error.message });
                return;
            }
            const connection = yield db_1.db.getConnection();
            try {
                yield connection.beginTransaction();
                // 1. Verificar que el usuario existe
                yield (0, Usuario_1.CheckearUsuario)(user_id);
                // 2. Validar productos y calcular total
                let total = 0;
                const items_procesados = [];
                for (const item of cart_items) {
                    const product = item.product;
                    const quantity = parseInt(item.quantity);
                    // Verificar que el producto existe y obtener datos actuales
                    const { producto_db } = yield (0, compras_1.CheckearProducto)(product, quantity);
                    const precio_unitario = parseFloat(Number(producto_db.precio_base).toFixed(2));
                    const subtotal = precio_unitario * quantity;
                    total += subtotal;
                    items_procesados.push({
                        producto_id: product.id,
                        cantidad: quantity,
                        precio_unitario: precio_unitario,
                        subtotal: subtotal,
                        nombre_producto: producto_db.producto
                    });
                }
                // 3. Crear el pedido principal
                const { pedido_id } = yield (0, compras_1.CrearCompra)(user_id, total, direccion_envio, referencias);
                // 4. Insertar items del pedido
                for (const item of items_procesados) {
                    yield (0, compras_1.InsertarItems)(pedido_id, item);
                }
                yield connection.commit();
                const data = { pedido_id: pedido_id, total: total.toFixed(2), items_count: items_procesados.length, estado: 'pendiente' };
                // Respuesta exitosa
                res.status(201).json({ success: true, message: 'Pedido creado exitosamente', data: data });
            }
            catch (error) {
                yield connection.rollback();
                console.error('Error al crear pedido:', error);
                res.status(500).json({ success: false, error: error });
            }
        });
    }
    static obtenerPedidosPorId(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const user_id = req.params.user_id;
            try {
                // Obtener pedidos del usuario sin paginación
                const { pedidos } = yield (0, compras_1.obtenerCompras)(user_id);
                res.json({ success: true, data: pedidos });
            }
            catch (error) {
                console.error('Error al obtener pedidos del usuario:', error);
                res.status(500).json({ success: false, error: error });
            }
        });
    }
    static actualizarCompraEstado(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const pedido_id = req.params.id;
            const { nuevo_estado } = req.body;
            const estados_validos = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];
            const connection = yield db_1.db.getConnection();
            try {
                if (!nuevo_estado || !estados_validos.includes(nuevo_estado)) {
                    res.status(400).json({
                        success: false,
                        error: 'Estado no válido',
                        estados_validos
                    });
                }
                yield connection.beginTransaction();
                // Verificar que el pedido existe y obtener estado actual
                const { estado_actual } = yield (0, compras_1.CheckearCompra)(parseInt(pedido_id));
                // Si se confirma el pedido, reducir stock
                if (estado_actual === 'pendiente' && nuevo_estado === 'confirmado') {
                    yield (0, compras_1.disminuirStock)(parseInt(pedido_id));
                }
                // Si se cancela un pedido confirmado, restaurar stock
                if (estado_actual === 'confirmado' && nuevo_estado === 'cancelado') {
                    yield (0, compras_1.restaurarStock)(parseInt(pedido_id));
                }
                // Actualizar estado del pedido
                yield (0, compras_1.ModificarEstado)(parseInt(pedido_id), nuevo_estado);
                const data = { pedido_id: parseInt(pedido_id), estado_anterior: estado_actual, estado_nuevo: nuevo_estado };
                yield connection.commit();
                res.json({ success: true, message: `Estado del pedido actualizado a: ${nuevo_estado}`, data: data });
            }
            catch (error) {
                yield connection.rollback();
                console.error('Error al actualizar estado:', error);
                res.status(500).json({ success: false, error: error });
            }
        });
    }
}
exports.pedidosController = pedidosController;

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
exports.PedidosController = void 0;
const pedidos_1 = require("../models/pedidos");
class PedidosController {
    static crearPedido(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { user_id, cart_items, direccion_envio, referencias, checkout_session_id } = req.body;
            // Validar que venga el checkout_session_id
            if (!checkout_session_id) {
                res.status(400).json({ success: false, message: 'Falta checkout_session_id' });
                return;
            }
            const resultado = yield pedidos_1.PedidosModel.crearPedido({
                user_id,
                cart_items,
                direccion_envio,
                referencias,
                checkout_session_id
            });
            const statusCode = resultado.success ? (resultado.message.includes('ya existía') ? 200 : 201) : 400;
            res.status(statusCode).json(resultado);
        });
    }
    static obtenerPedidosPorId(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const user_id = req.params.user_id;
            const resultado = yield pedidos_1.PedidosModel.obtenerPedidosPorUsuario(user_id);
            const statusCode = resultado.success ? 200 : 500;
            res.status(statusCode).json(resultado);
        });
    }
    static actualizarCompraEstado(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const pedido_id = parseInt(req.params.id);
            const { nuevo_estado } = req.body;
            if (!pedido_id || isNaN(pedido_id)) {
                res.status(400).json({
                    success: false,
                    message: 'ID de pedido no válido'
                });
                return;
            }
            const resultado = yield pedidos_1.PedidosModel.actualizarEstadoPedido(pedido_id, nuevo_estado);
            const statusCode = resultado.success ? 200 : (resultado.message.includes('no encontrado') ? 404 : 400);
            res.status(statusCode).json(resultado);
        });
    }
    static obtenerTodosLosPedidos(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resultado = yield pedidos_1.PedidosModel.obtenerTodosLosPedidos();
                const statusCode = resultado.success ? 200 : 500;
                res.status(statusCode).json(resultado);
            }
            catch (error) {
                console.error(error);
                res.status(500).json({
                    success: false,
                    message: "Error al obtener los pedidos",
                });
            }
        });
    }
    static updateEstadoPedido(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const pedido_id = req.params.id;
            const { nuevo_estado } = req.body;
            if (!pedido_id || !nuevo_estado) {
                res.status(400).json({
                    success: false,
                    message: 'ID de pedido no válido'
                });
                return;
            }
            const resultado = yield pedidos_1.PedidosModel.updateEstadoPedido(pedido_id, nuevo_estado);
            const statusCode = resultado.success ? 200 : 400;
            res.status(statusCode).json(resultado);
        });
    }
}
exports.PedidosController = PedidosController;

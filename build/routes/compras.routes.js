"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouterCompras = void 0;
const pedidos_1 = require("../controllers/pedidos");
const express_1 = require("express");
exports.RouterCompras = (0, express_1.Router)();
// POST /api/compras/crear-pedido
exports.RouterCompras.post('/crear-pedido', pedidos_1.pedidosController.crearPedido);
// GET /api/compras/usuario/:user_id - Obtener TODOS los pedidos de un usuario (sin paginación)
exports.RouterCompras.get('/usuario/:user_id', pedidos_1.pedidosController.obtenerPedidosPorId);
// PUT /api/compras/pedido/:id/estado - Actualizar estado del pedido
exports.RouterCompras.put('/pedido/:id/estado', pedidos_1.pedidosController.actualizarCompraEstado);

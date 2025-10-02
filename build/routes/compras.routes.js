"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouterCompras = void 0;
const pedidos_1 = require("../controllers/pedidos");
const express_1 = require("express");
exports.RouterCompras = (0, express_1.Router)();
// POST /api/compras/crear-pedido
exports.RouterCompras.post('/crear-pedido', pedidos_1.PedidosController.crearPedido);
// GET /api/compras/usuario/:user_id - Obtener TODOS los pedidos de un usuario (sin paginación)
exports.RouterCompras.get('/usuario/:user_id', pedidos_1.PedidosController.obtenerPedidosPorId);
//  GET /api/compras/todos - Obtener TODOS los pedidos (sin paginación)
exports.RouterCompras.get('/pedidos/todos', pedidos_1.PedidosController.obtenerTodosLosPedidos);
// GET /api/compras/pedido/status/:id - Obtener el estado de un pedido
exports.RouterCompras.put('/pedidos/status/:id', pedidos_1.PedidosController.updateEstadoPedido);

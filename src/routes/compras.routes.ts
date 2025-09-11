import { pedidosController } from '../controllers/pedidos';
import { Router } from 'express';

export const RouterCompras = Router();

// POST /api/compras/crear-pedido
RouterCompras.post('/crear-pedido', pedidosController.crearPedido);

// GET /api/compras/usuario/:user_id - Obtener TODOS los pedidos de un usuario (sin paginación)
RouterCompras.get('/usuario/:user_id', pedidosController.obtenerPedidosPorId);

// PUT /api/compras/pedido/:id/estado - Actualizar estado del pedido
RouterCompras.put('/pedido/:id/estado', pedidosController.actualizarCompraEstado);


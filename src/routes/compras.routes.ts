import { PedidosController } from '../controllers/pedidos';
import { Router } from 'express';

export const RouterCompras = Router();

// POST /api/compras/crear-pedido
RouterCompras.post('/crear-pedido', PedidosController.crearPedido);

// GET /api/compras/usuario/:user_id - Obtener TODOS los pedidos de un usuario (sin paginación)
RouterCompras.get('/usuario/:user_id', PedidosController.obtenerPedidosPorId);

//  GET /api/compras/todos - Obtener TODOS los pedidos (sin paginación)
RouterCompras.get('/pedidos/todos', PedidosController.obtenerTodosLosPedidos);



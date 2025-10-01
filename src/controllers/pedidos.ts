import { Request, Response } from 'express';
import { PedidosModel } from '../models/pedidos';

export class PedidosController {

    static async crearPedido(req: Request, res: Response) {
        const { user_id, cart_items, direccion_envio, referencias, checkout_session_id } = req.body;

        // Validar que venga el checkout_session_id
        if (!checkout_session_id) {
            res.status(400).json({ success: false, message: 'Falta checkout_session_id' });
            return;
        }

        const resultado = await PedidosModel.crearPedido({
            user_id,
            cart_items,
            direccion_envio,
            referencias,
            checkout_session_id
        });

        const statusCode = resultado.success ? (resultado.message.includes('ya existía') ? 200 : 201) : 400;
        res.status(statusCode).json(resultado);
    }

    static async obtenerPedidosPorId(req: Request, res: Response) {
        const user_id = req.params.user_id;

        const resultado = await PedidosModel.obtenerPedidosPorUsuario(user_id);

        const statusCode = resultado.success ? 200 : 500;
        res.status(statusCode).json(resultado);
    }

    static async actualizarCompraEstado(req: Request, res: Response) {
        const pedido_id = parseInt(req.params.id);
        const { nuevo_estado } = req.body;

        if (!pedido_id || isNaN(pedido_id)) {
            res.status(400).json({
                success: false,
                message: 'ID de pedido no válido'
            });
            return;
        }

        const resultado = await PedidosModel.actualizarEstadoPedido(pedido_id, nuevo_estado);

        const statusCode = resultado.success ? 200 : (resultado.message.includes('no encontrado') ? 404 : 400);
        res.status(statusCode).json(resultado);
    }

    static async obtenerTodosLosPedidos(_req: Request, res: Response) {
        try {
            const resultado = await PedidosModel.obtenerTodosLosPedidos();

            const statusCode = resultado.success ? 200 : 500;
            res.status(statusCode).json(resultado);
        } catch (error) {
            console.error(error);
            res.status(500).json({
                success: false,
                message: "Error al obtener los pedidos",
            });
        }
    }

    static async updateEstadoPedido(req: Request, res: Response) {

        const pedido_id = req.params.id
        const { nuevo_estado } = req.body;

        if (!pedido_id || !nuevo_estado) {
            res.status(400).json({
                success: false,
                message: 'ID de pedido no válido'
            });
            return;
        }

        const resultado = await PedidosModel.updateEstadoPedido(pedido_id, nuevo_estado);

        const statusCode = resultado.success ? 200 : 400;
        res.status(statusCode).json(resultado);
    }
}
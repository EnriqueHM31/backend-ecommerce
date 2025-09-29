import { Request, Response } from 'express';
import { PedidosController } from '../../src/controllers/pedidos';
import { PedidosModel } from '../../src/models/pedidos';

// Mock del modelo
jest.mock('../../src/models/pedidos');
const MockedPedidosModel = PedidosModel as jest.Mocked<typeof PedidosModel>;

describe('PedidosController', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;

    beforeEach(() => {
        mockJson = jest.fn();
        mockStatus = jest.fn().mockReturnValue({ json: mockJson });

        mockReq = {
            body: {},
            params: {},
        };

        mockRes = {
            status: mockStatus,
            json: mockJson,
        };

        // Limpiar todos los mocks
        jest.clearAllMocks();
    });

    describe('crearPedido', () => {
        it('debería devolver 400 cuando falta checkout_session_id', async () => {
            mockReq.body = {
                user_id: 'user123',
                cart_items: [{ id: 'prod1', quantity: 2 }],
                direccion_envio: {
                    line1: 'Calle 123',
                    line2: 'Colonia Centro',
                    city: 'Ciudad',
                    state: 'Estado',
                    postal_code: '12345',
                    country: 'México'
                }
            };

            await PedidosController.crearPedido(mockReq as Request, mockRes as Response);

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                message: 'Falta checkout_session_id'
            });
        });

        it('debería crear un pedido exitosamente', async () => {
            const mockPedidoData = {
                user_id: 'user123',
                cart_items: [{ id: 'prod1', quantity: 2 }],
                direccion_envio: {
                    line1: 'Calle 123',
                    line2: 'Colonia Centro',
                    city: 'Ciudad',
                    state: 'Estado',
                    postal_code: '12345',
                    country: 'México'
                },
                checkout_session_id: 'cs_test_123'
            };

            mockReq.body = mockPedidoData;

            const mockResult = {
                success: true,
                message: 'Pedido creado exitosamente',
                data: {
                    pedido_id: 'cs_test_123',
                    total: '100.00',
                    items_count: 1,
                    estado: 'pendiente'
                }
            };

            MockedPedidosModel.crearPedido.mockResolvedValue(mockResult);

            await PedidosController.crearPedido(mockReq as Request, mockRes as Response);

            expect(MockedPedidosModel.crearPedido).toHaveBeenCalledWith(mockPedidoData);
            expect(mockStatus).toHaveBeenCalledWith(201);
            expect(mockJson).toHaveBeenCalledWith(mockResult);
        });

        it('debería devolver 200 cuando el pedido ya existe', async () => {
            const mockPedidoData = {
                user_id: 'user123',
                cart_items: [{ id: 'prod1', quantity: 2 }],
                direccion_envio: {
                    line1: 'Calle 123',
                    line2: 'Colonia Centro',
                    city: 'Ciudad',
                    state: 'Estado',
                    postal_code: '12345',
                    country: 'México'
                },
                checkout_session_id: 'cs_test_123'
            };

            mockReq.body = mockPedidoData;

            const mockResult = {
                success: true,
                message: 'Pedido ya existía, no se duplicó',
                data: { pedido_id: 'cs_test_123' }
            };

            MockedPedidosModel.crearPedido.mockResolvedValue(mockResult);

            await PedidosController.crearPedido(mockReq as Request, mockRes as Response);

            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith(mockResult);
        });

        it('debería manejar errores del modelo correctamente', async () => {
            const mockPedidoData = {
                user_id: 'user123',
                cart_items: [{ id: 'prod1', quantity: 2 }],
                direccion_envio: {
                    line1: 'Calle 123',
                    line2: 'Colonia Centro',
                    city: 'Ciudad',
                    state: 'Estado',
                    postal_code: '12345',
                    country: 'México'
                },
                checkout_session_id: 'cs_test_123'
            };

            mockReq.body = mockPedidoData;

            const mockErrorResult = {
                success: false,
                message: 'Usuario no encontrado'
            };

            MockedPedidosModel.crearPedido.mockResolvedValue(mockErrorResult);

            await PedidosController.crearPedido(mockReq as Request, mockRes as Response);

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith(mockErrorResult);
        });
    });

    describe('obtenerPedidosPorId', () => {
        it('debería obtener pedidos por usuario exitosamente', async () => {
            const userId = 'user123';
            mockReq.params = { user_id: userId };

            const mockResult = {
                success: true,
                message: 'Pedidos obtenidos correctamente',
                data: [
                    {
                        id: 'cs_test_123',
                        usuario_id: userId,
                        total: 100.00,
                        estado: 'pendiente'
                    }
                ]
            };

            MockedPedidosModel.obtenerPedidosPorUsuario.mockResolvedValue(mockResult);

            await PedidosController.obtenerPedidosPorId(mockReq as Request, mockRes as Response);

            expect(MockedPedidosModel.obtenerPedidosPorUsuario).toHaveBeenCalledWith(userId);
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith(mockResult);
        });

        it('debería manejar errores al obtener pedidos', async () => {
            const userId = 'user123';
            mockReq.params = { user_id: userId };

            const mockErrorResult = {
                success: false,
                message: 'Error al obtener pedidos'
            };

            MockedPedidosModel.obtenerPedidosPorUsuario.mockResolvedValue(mockErrorResult);

            await PedidosController.obtenerPedidosPorId(mockReq as Request, mockRes as Response);

            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith(mockErrorResult);
        });
    });

    describe('actualizarCompraEstado', () => {
        it('debería devolver 400 cuando el ID de pedido no es válido', async () => {
            mockReq.params = { id: 'invalid' };
            mockReq.body = { nuevo_estado: 'confirmado' };

            await PedidosController.actualizarCompraEstado(mockReq as Request, mockRes as Response);

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                message: 'ID de pedido no válido'
            });
        });

        it('debería actualizar el estado del pedido exitosamente', async () => {
            const pedidoId = 123;
            mockReq.params = { id: pedidoId.toString() };
            mockReq.body = { nuevo_estado: 'confirmado' };

            const mockResult = {
                success: true,
                message: 'Estado del pedido actualizado a: confirmado',
                data: {
                    pedido_id: pedidoId,
                    estado_anterior: 'pendiente',
                    estado_nuevo: 'confirmado'
                }
            };

            MockedPedidosModel.actualizarEstadoPedido.mockResolvedValue(mockResult);

            await PedidosController.actualizarCompraEstado(mockReq as Request, mockRes as Response);

            expect(MockedPedidosModel.actualizarEstadoPedido).toHaveBeenCalledWith(pedidoId, 'confirmado');
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith(mockResult);
        });

        it('debería devolver 404 cuando el pedido no se encuentra', async () => {
            const pedidoId = 999;
            mockReq.params = { id: pedidoId.toString() };
            mockReq.body = { nuevo_estado: 'confirmado' };

            const mockErrorResult = {
                success: false,
                message: 'Pedido no encontrado'
            };

            MockedPedidosModel.actualizarEstadoPedido.mockResolvedValue(mockErrorResult);

            await PedidosController.actualizarCompraEstado(mockReq as Request, mockRes as Response);

            expect(mockStatus).toHaveBeenCalledWith(404);
            expect(mockJson).toHaveBeenCalledWith(mockErrorResult);
        });
    });
});

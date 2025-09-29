import { Request, Response } from "express";
import { ProductosController } from "../../src/controllers/productos";
import { ModeloProductos } from "../../src/models/productos";

// Mock del modelo
jest.mock("../../src/models/productos");
const MockedModeloProductos = ModeloProductos as jest.Mocked<typeof ModeloProductos>;

describe("ProductosController", () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;

    beforeEach(() => {
        mockJson = jest.fn();
        mockStatus = jest.fn().mockReturnValue({ json: mockJson });

        mockReq = {};
        mockRes = {
            status: mockStatus,
            json: mockJson,
        };

        jest.clearAllMocks();
    });

    describe("ListarProductos", () => {
        it("debería devolver productos exitosamente", async () => {
            const mockResult = {
                success: true,
                data: [{ id: "prod1", nombre: "Producto 1" }],
                message: "Productos obtenidos correctamente"
            };

            MockedModeloProductos.ListarProductos.mockResolvedValue(mockResult as any);

            await ProductosController.ListarProductos(mockReq as Request, mockRes as Response);

            expect(MockedModeloProductos.ListarProductos).toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith({
                success: true,
                data: mockResult.data,
                message: mockResult.message
            });
        });

        it("debería devolver 400 cuando ocurre un error en el modelo", async () => {
            const mockError = {
                success: false,
                message: "Error al obtener productos"
            };

            MockedModeloProductos.ListarProductos.mockResolvedValue(mockError as any);

            await ProductosController.ListarProductos(mockReq as Request, mockRes as Response);

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                message: mockError.message
            });
        });

        it("debería manejar errores inesperados con 500", async () => {
            MockedModeloProductos.ListarProductos.mockRejectedValue(new Error("DB Error"));

            await ProductosController.ListarProductos(mockReq as Request, mockRes as Response);

            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                message: "Error interno del servidor"
            });
        });
    });
});

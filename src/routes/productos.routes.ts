import { Router } from "express";
import { ProductosController } from "../controllers/productos";

export const ProductosRouter = Router();

ProductosRouter.get("/todos", ProductosController.ListarProductos);

ProductosRouter.get("/todos/activos", ProductosController.ListarProductosActivos);

ProductosRouter.get("/top", ProductosController.topProductos);
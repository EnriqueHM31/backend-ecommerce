import { Router } from "express";
import { ProductosController } from "../controllers/productos";

export const ProductosRouter = Router();

ProductosRouter.get("/todos", ProductosController.ListarProductos); 

// routes/compra.ts
import { CompraController } from "../controllers/compra";
import { Router } from "express";

export const PagosRouter = Router();


PagosRouter.post("/checkout-session", CompraController.RealizarCompra);

PagosRouter.get("/checkout-session", CompraController.ObtenerCompraPorSessionId);

PagosRouter.get("/pedidos/:id", CompraController.ObtenerCompraDeUnUsuarioPorId);



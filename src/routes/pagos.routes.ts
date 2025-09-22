// routes/compra.ts
import { CompraController } from "../controllers/compra";
import { Router } from "express";

export const PagosRouter = Router();


PagosRouter.post("/checkout-session", CompraController.RealizarCompra);

PagosRouter.get("/checkout-session", CompraController.ObtenerCompraIdSession);

PagosRouter.get("/pedidos/:email", CompraController.ObtenerComprasPorEmail);



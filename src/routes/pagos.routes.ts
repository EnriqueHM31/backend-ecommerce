// routes/compra.ts
import { CompraController } from "@/controllers/compra";
import { Router } from "express";

export const CompraRouter = Router();


CompraRouter.post("/checkout-session", CompraController.RealizarCompra);

CompraRouter.get("/checkout-session", CompraController.ObtenerCompraIdSession);

CompraRouter.get("/pedidos/:email", CompraController.ObtenerComprasPorEmail);



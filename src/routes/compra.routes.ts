// routes/compra.ts
import { CompraController } from "@/controllers/compra";
import { Router } from "express";

export const CompraRouter = Router();

CompraRouter.post("/checkout-session", CompraController.RealizarCompra);

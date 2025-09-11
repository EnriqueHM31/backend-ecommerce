import { AutenticacionController } from "../controllers/autenticacion";
import { Router } from "express";
export const UsuarioRouter = Router();

UsuarioRouter.post("/auth", AutenticacionController.Auth);

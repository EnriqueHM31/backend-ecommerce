import { Router } from "express";
import { ComentariosController } from "../controllers/comentarios";


export const ComentariosRouter = Router();

ComentariosRouter.post("/enviar-mensaje", ComentariosController.EnviarMensaje);
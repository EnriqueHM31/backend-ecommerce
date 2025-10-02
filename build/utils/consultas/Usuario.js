"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckearUsuario = CheckearUsuario;
exports.InsertarUsuario = InsertarUsuario;
const db_1 = require("../../database/db");
function CheckearUsuario(user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // maybeSingle devuelve Usuario | null
            const { data: userCheck, error } = yield db_1.supabase
                .from("usuarios")
                .select("id_usuario")
                .eq("id_usuario", user_id)
                .maybeSingle();
            if (error)
                throw error;
            return { existe: !!userCheck };
        }
        catch (err) {
            console.error("Error verificando usuario:", err);
            throw err;
        }
    });
}
function InsertarUsuario(usuario_id, nombre, correo) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { data, error } = yield db_1.supabase
                .from("usuarios")
                .insert([{ id_usuario: usuario_id, nombre, correo, id_rol: 1 }])
                .select("id_usuario, nombre, correo")
                .maybeSingle();
            if (error)
                throw new Error(`Error al insertar usuario: ${error.message}`);
            if (!data)
                throw new Error("Error al insertar usuario: resultado vacío");
            return data;
        }
        catch (err) {
            console.error("Error insertando usuario:", err);
            throw err;
        }
    });
}

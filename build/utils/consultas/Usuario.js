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
        const [userCheck] = yield db_1.db.execute('SELECT id FROM customer WHERE id = ?', [user_id]);
        if (userCheck.length !== 0)
            return { existe: true };
        return { existe: false };
    });
}
function InsertarUsuario(usuario_id, nombre, correo, avatar) {
    return __awaiter(this, void 0, void 0, function* () {
        const connection = yield db_1.db.getConnection();
        const [resultInsert] = yield connection.query("INSERT INTO customer (id, nombre, correo, avatar) VALUES (?, ?, ?, ?)", [usuario_id, nombre, correo, avatar]);
        if (!resultInsert)
            throw new Error("Error al insertar usuario");
    });
}

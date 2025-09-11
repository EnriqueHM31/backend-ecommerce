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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.guardarCompras = guardarCompras;
// Función para guardar compras persistentes
const prediccion_1 = require("../../constants/prediccion");
const fs_1 = __importDefault(require("fs"));
function guardarCompras(_a) {
    return __awaiter(this, arguments, void 0, function* ({ comprasPersistentes }) {
        fs_1.default.writeFileSync(prediccion_1.DATA_FILE, JSON.stringify(comprasPersistentes, null, 2));
    });
}

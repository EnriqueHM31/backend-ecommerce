"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const comentarios_routes_1 = require("./routes/comentarios.routes");
const productos_routes_1 = require("./routes/productos.routes");
const pagos_routes_1 = require("./routes/pagos.routes");
const usuario_routes_1 = require("./routes/usuario.routes");
//import { PrediccionRouter } from './routes/prediccion.routes';
const config_1 = require("./config");
const prediccion_routes_1 = require("./routes/prediccion.routes");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173',
    'http://192.168.1.104:5173', 'https://dentista-ckilsr2uh-enrique-s-projects-104cc828.vercel.app', 'https://dentista-web-eight.vercel.app'];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('El CORS no permite el acceso desde este origen.'));
        }
    },
    credentials: true
}));
app.use('/api', comentarios_routes_1.ComentariosRouter);
app.use('/api/productos', productos_routes_1.ProductosRouter);
app.use('/api/compra', pagos_routes_1.CompraRouter);
app.use('/api/usuario', usuario_routes_1.UsuarioRouter);
app.use('/api', prediccion_routes_1.PrediccionRouter);
app.use("/", (_req, res) => {
    res.send("Ecommerce API");
});
app.listen(config_1.PORT, () => {
    console.log(`Server is running on port ${config_1.PORT}`);
});

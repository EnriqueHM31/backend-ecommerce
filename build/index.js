"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const comentarios_routes_1 = require("./routes/comentarios.routes");
const compras_routes_1 = require("./routes/compras.routes");
const pagos_routes_1 = require("./routes/pagos.routes");
const productos_routes_1 = require("./routes/productos.routes");
const usuario_routes_1 = require("./routes/usuario.routes");
//import { PrediccionRouter } from './routes/prediccion.routes';
const config_1 = require("./config");
const categorias_routes_1 = __importDefault(require("./routes/categorias.routes"));
const createProductos_routes_1 = __importDefault(require("./routes/createProductos.routes"));
const tecnicos_routes_1 = __importDefault(require("./routes/tecnicos.routes"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173',
    'http://192.168.1.104:5173', 'https://dentista-ckilsr2uh-enrique-s-projects-104cc828.vercel.app', 'https://dentista-web-eight.vercel.app', "http://192.168.56.1:5173", "https://ecommerce-recomendaciones.vercel.app"];
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
app.use('/api/compra', pagos_routes_1.PagosRouter);
app.use('/api/usuario', usuario_routes_1.UsuarioRouter);
//app.use('/api', RouterPrediccion);
app.use('/api', compras_routes_1.RouterCompras);
app.use('/api/categorias', categorias_routes_1.default);
app.use('/api/tecnicos', tecnicos_routes_1.default);
app.use('/api/create', createProductos_routes_1.default);
app.get("/", (_req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Ecommerce API</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 0;
                background: #f5f5f5;
                display: flex;
                flex-direction: column;
                min-height: 100vh;
            }
            header {
                background: #0d6efd;
                color: white;
                padding: 2rem;
                text-align: center;
            }
            main {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                padding: 2rem;
            }
            h1 {
                margin-bottom: 1rem;
            }
            p {
                color: #333;
                margin-bottom: 2rem;
            }
            a.button {
                background: #0d6efd;
                color: white;
                padding: 1rem 2rem;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                transition: background 0.3s ease;
            }
            a.button:hover {
                background: #0056b3;
            }
            footer {
                background: #e9ecef;
                padding: 1rem;
                text-align: center;
                font-size: 0.9rem;
                color: #555;
            }
        </style>
    </head>
    <body>
        <header>
            <h1>Bienvenido a la API de Ecommerce</h1>
        </header>
        <main>
            <p>Esta es tu API de ecommerce. Aquí puedes consultar productos, crear pedidos y procesar pagos con Stripe.</p>
            <a class="button" href="/docs" target="_blank">Ver documentación</a>
        </main>
        <footer>
            &copy; ${new Date().getFullYear()} Ecommerce API. Todos los derechos reservados.
        </footer>
    </body>
    </html>
    `);
});
app.listen(config_1.PORT, () => {
    console.log(`Server is running on port ${config_1.PORT}`);
});

import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { ComentariosRouter } from './routes/comentarios.routes';
import { RouterCompras } from './routes/compras.routes';
import { PagosRouter } from './routes/pagos.routes';
import { ProductosRouter } from './routes/productos.routes';
import { UsuarioRouter } from './routes/usuario.routes';
//import { PrediccionRouter } from './routes/prediccion.routes';
import { PORT } from './config';
import RouterCategorias from './routes/categorias.routes';
import RouterTecnicos from './routes/tecnicos.routes';
import RouterCreateProductos from './routes/createProductos.routes';


const app = express();
app.use(express.json());

const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173',
    'http://192.168.1.104:5173', 'https://dentista-ckilsr2uh-enrique-s-projects-104cc828.vercel.app', 'https://dentista-web-eight.vercel.app'];



app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('El CORS no permite el acceso desde este origen.'));
        }
    },
    credentials: true
}));


app.use('/api', ComentariosRouter);
app.use('/api/productos', ProductosRouter);
app.use('/api/compra', PagosRouter);
app.use('/api/usuario', UsuarioRouter);
//app.use('/api', RouterPrediccion);
app.use('/api', RouterCompras);
app.use('/api/categorias', RouterCategorias);
app.use('/api/tecnicos', RouterTecnicos);

app.use('/api/create', RouterCreateProductos);


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


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
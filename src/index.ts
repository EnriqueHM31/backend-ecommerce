import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { ComentariosRouter } from './routes/comentarios.routes';
import { ProductosRouter } from './routes/productos.routes';
import { CompraRouter } from './routes/pagos.routes';
import { UsuarioRouter } from './routes/usuario.routes';
import { PrediccionRouter } from './routes/prediccion.routes';
import { PORT } from './config';


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
app.use('/api/compra', CompraRouter);
app.use('/api/usuario', UsuarioRouter);
app.use('/api', PrediccionRouter);

app.use("/", (_req, res) => {
    res.send("Ecommerce API");
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
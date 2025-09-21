import { Router, Request, Response } from 'express';
import { FiltradoColaborativo } from '../class/Prediccion2';
import { Compra } from '../types/prediccion';
import { guardarCompras } from '../utils/pagos/predicciones';
import fs from 'fs';
import { DATA_FILE } from '../constants/prediccion';
import { supabase } from '../database/db';

const RouterPrediccion = Router();
const sistemaRecomendacion = new FiltradoColaborativo();

const cargarCompras = (): Compra[] => {
    if (!fs.existsSync(DATA_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as Compra[];
    } catch (e) {
        console.error("Error al leer compras persistidas:", e);
        return [] as Compra[];
    }
};


(async () => {
    try {
        await sistemaRecomendacion.cargarModelo();
        console.log('✅ Modelo cargado automáticamente');
    } catch (error) {
        console.warn('⚠️ No se encontró modelo previo, inicializando vacío');
    }
})();

// ==============================
// 🚀 MIDDLEWARE DE VALIDACIÓN
// ==============================
const validarUsuario = (req: Request, res: Response, next: Function) => {
    const { usuario } = req.params;
    if (!usuario || usuario.trim() === '') {
        res.status(400).json({
            success: false,
            error: 'El parámetro usuario es requerido'
        });
    }
    next();
};

const validarProducto = (req: Request, res: Response, next: Function) => {
    const { producto } = req.params;
    if (!producto || producto.trim() === '') {
        res.status(400).json({
            success: false,
            error: 'El parámetro producto es requerido'
        });
    }
    next();
};

// ==============================
// 🚀 RUTAS DE INICIALIZACIÓN
// ==============================

/**
 * POST /api/recomendaciones/inicializar
 * Inicializa el sistema con datos de compras
 */
RouterPrediccion.post('/inicializar', async (req: Request, res: Response) => {
    try {
        const { compras }: { compras: Compra[] } = req.body;

        if (!compras || !Array.isArray(compras) || compras.length === 0) {
            res.status(400).json({
                success: false,
                error: 'Se requiere un array de compras válido'
            });
        }

        let comprasPersistentes: Compra[] = cargarCompras();
        comprasPersistentes.push(...compras);
        guardarCompras({ comprasPersistentes });

        // Validar estructura de compras
        for (const compra of compras) {
            if (!compra.usuario || !compra.producto || compra.cantidad === undefined) {
                res.status(400).json({
                    success: false,
                    error: 'Cada compra debe tener usuario, producto y cantidad'
                });
            }
        }

        await sistemaRecomendacion.inicializar(compras as Compra[]);
        const estadisticas = sistemaRecomendacion.obtenerEstadisticas();

        res.json({
            success: true,
            message: 'Sistema inicializado correctamente',
            estadisticas
        });

    } catch (error) {
        console.error('Error inicializando sistema:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

/**
 * POST /api/recomendaciones/cargar
 * Carga un modelo previamente guardado
 */
RouterPrediccion.post('/cargar', async (_req: Request, res: Response) => {
    try {
        await sistemaRecomendacion.cargarModelo();
        const estadisticas = sistemaRecomendacion.obtenerEstadisticas();

        res.json({
            success: true,
            message: 'Modelo cargado correctamente',
            estadisticas
        });

    } catch (error) {
        console.error('Error cargando modelo:', error);
        res.status(404).json({
            success: false,
            error: 'No se pudo cargar el modelo. Asegúrese de que existe.'
        });
    }
});

// ==============================
// 🚀 RUTAS DE RECOMENDACIÓN
// ==============================

/**
 * GET /api/recomendaciones/usuario/:usuario
 * Obtiene recomendaciones para un usuario específico
 */
RouterPrediccion.get('/usuario/:usuario', validarUsuario, async (req: Request, res: Response) => {
    try {
        const { usuario } = req.params;
        const {
            limite = '4',
            metodo = 'coseno',
        } = req.query;

        if (!usuario) {
            const populares = sistemaRecomendacion.obtenerProductosPopulares();
            res.json({
                success: true,
                usuario,
                recomendaciones: null,
                populares,
                total: populares?.length
            });
        }

        const topK = parseInt(limite as string);
        const algoritmo = metodo as 'coseno' | 'pearson';

        if (isNaN(topK) || topK <= 0 || topK > 50) {
            res.status(400).json({
                success: false,
                error: 'El límite debe ser un número entre 1 y 50'
            });
        }

        if (!['coseno', 'pearson'].includes(algoritmo)) {
            res.status(400).json({
                success: false,
                error: 'El método debe ser "coseno" o "pearson"'
            });
        }

        const { recomendaciones, populares } = await sistemaRecomendacion.predecir(
            usuario,
            topK,
            algoritmo
        );

        res.json({
            success: true,
            usuario,
            metodo: algoritmo,
            recomendaciones,
            populares,
            total: recomendaciones?.length || populares?.length
        });

    } catch (error) {
        console.error('Error generando recomendaciones:', error);
        res.status(500).json({
            success: false,
            error: 'Error generando recomendaciones'
        });
    }
});

/**
 * GET /api/recomendaciones/producto/:producto
 * Obtiene productos similares a uno dado
 */
RouterPrediccion.get('/producto/:producto', validarProducto, async (req: Request, res: Response) => {
    try {
        const { producto } = req.params;
        const { limite = '5' } = req.query;

        const topK = parseInt(limite as string);

        if (isNaN(topK) || topK <= 0 || topK > 50) {
            res.status(400).json({
                success: false,
                error: 'El límite debe ser un número entre 1 y 50'
            });
        }

        const productosSimiliares = await sistemaRecomendacion.recomendarPorProducto(
            producto,
            topK
        );

        res.json({
            success: true,
            producto,
            similares: productosSimiliares,
            total: productosSimiliares.length
        });

    } catch (error) {
        console.error('Error buscando productos similares:', error);
        res.status(500).json({
            success: false,
            error: 'Error buscando productos similares'
        });
    }
});

// ==============================
// 🚀 RUTAS DE INFORMACIÓN
// ==============================

/**
 * GET /api/recomendaciones/estadisticas
 * Obtiene estadísticas del sistema
 */
RouterPrediccion.get('/estadisticas', (_req: Request, res: Response) => {
    try {
        const estadisticas = sistemaRecomendacion.obtenerEstadisticas();

        res.json({
            success: true,
            estadisticas
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estadísticas'
        });
    }
});

/**
 * GET /api/recomendaciones/salud
 * Verifica el estado del sistema
 */
RouterPrediccion.get('/salud', (_req: Request, res: Response) => {
    const estadisticas = sistemaRecomendacion.obtenerEstadisticas();

    res.json({
        success: true,
        estado: 'activo',
        version: '1.0.0',
        inicializado: (estadisticas as any).inicializado,
        timestamp: new Date().toISOString()
    });
});



RouterPrediccion.post("/usuario/recomendar", async (req: Request, res: Response) => {
    try {
        const compras: Compra[] = req.body.compras;
        const { id_usuario } = req.body;
        if (!compras || compras.length === 0) {
            const { data: resultItems, error } = await supabase.rpc('get_user_purchases', {
                user_id_param: id_usuario
            });

            if (error) {
                console.error('Error fetching user purchases:', error);
                res.status(500).json({ error: 'Error al obtener compras del usuario' });
                return;
            }

            if (!resultItems || resultItems.length === 0) {
                const { populares } = await sistemaRecomendacion.agregarUsuario(compras);
                res.json({
                    mensaje: "✅ Usuario agregado y modelo actualizado",
                    recomendaciones: null,
                    populares
                });
                return;
            }

            const transformados = resultItems.map((item: any) => ({
                usuario: id_usuario,
                producto: `${item.sku} - ${item.nombre_variante}`,
                cantidad: item.cantidad
            }));

            console.log(transformados);

            const { prediccionesall, populares } = await sistemaRecomendacion.agregarUsuario(transformados);
            res.json({
                mensaje: "✅ Usuario agregado y modelo actualizado",
                recomendaciones: prediccionesall,
                populares
            });
            console.log(prediccionesall);
            return;
        }

        const { prediccionesall, populares } = await sistemaRecomendacion.agregarUsuario(compras);
        res.json({
            mensaje: "✅ Usuario agregado y modelo actualizado",
            recomendaciones: prediccionesall,
            populares
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});
export default RouterPrediccion;
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
const express_1 = require("express");
const Prediccion2_1 = require("../class/Prediccion2");
const predicciones_1 = require("../utils/pagos/predicciones");
const fs_1 = __importDefault(require("fs"));
const prediccion_1 = require("../constants/prediccion");
const db_1 = require("../database/db");
const RouterPrediccion = (0, express_1.Router)();
const sistemaRecomendacion = new Prediccion2_1.FiltradoColaborativo();
const cargarCompras = () => {
    if (!fs_1.default.existsSync(prediccion_1.DATA_FILE))
        return [];
    try {
        return JSON.parse(fs_1.default.readFileSync(prediccion_1.DATA_FILE, 'utf8'));
    }
    catch (e) {
        console.error("Error al leer compras persistidas:", e);
        return [];
    }
};
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield sistemaRecomendacion.cargarModelo();
        console.log('✅ Modelo cargado automáticamente');
    }
    catch (error) {
        console.warn('⚠️ No se encontró modelo previo, inicializando vacío');
    }
}))();
// ==============================
// 🚀 MIDDLEWARE DE VALIDACIÓN
// ==============================
const validarUsuario = (req, res, next) => {
    const { usuario } = req.params;
    if (!usuario || usuario.trim() === '') {
        res.status(400).json({
            success: false,
            error: 'El parámetro usuario es requerido'
        });
    }
    next();
};
const validarProducto = (req, res, next) => {
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
RouterPrediccion.post('/inicializar', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { compras } = req.body;
        if (!compras || !Array.isArray(compras) || compras.length === 0) {
            res.status(400).json({
                success: false,
                error: 'Se requiere un array de compras válido'
            });
        }
        let comprasPersistentes = cargarCompras();
        comprasPersistentes.push(...compras);
        (0, predicciones_1.guardarCompras)({ comprasPersistentes });
        // Validar estructura de compras
        for (const compra of compras) {
            if (!compra.usuario || !compra.producto || compra.cantidad === undefined) {
                res.status(400).json({
                    success: false,
                    error: 'Cada compra debe tener usuario, producto y cantidad'
                });
            }
        }
        yield sistemaRecomendacion.inicializar(compras);
        const estadisticas = sistemaRecomendacion.obtenerEstadisticas();
        res.json({
            success: true,
            message: 'Sistema inicializado correctamente',
            estadisticas
        });
    }
    catch (error) {
        console.error('Error inicializando sistema:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
}));
/**
 * POST /api/recomendaciones/cargar
 * Carga un modelo previamente guardado
 */
RouterPrediccion.post('/cargar', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield sistemaRecomendacion.cargarModelo();
        const estadisticas = sistemaRecomendacion.obtenerEstadisticas();
        res.json({
            success: true,
            message: 'Modelo cargado correctamente',
            estadisticas
        });
    }
    catch (error) {
        console.error('Error cargando modelo:', error);
        res.status(404).json({
            success: false,
            error: 'No se pudo cargar el modelo. Asegúrese de que existe.'
        });
    }
}));
// ==============================
// 🚀 RUTAS DE RECOMENDACIÓN
// ==============================
/**
 * GET /api/recomendaciones/usuario/:usuario
 * Obtiene recomendaciones para un usuario específico
 */
RouterPrediccion.get('/usuario/:usuario', validarUsuario, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { usuario } = req.params;
        const { limite = '5', metodo = 'coseno', } = req.query;
        const topK = parseInt(limite);
        const algoritmo = metodo;
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
        const recomendaciones = yield sistemaRecomendacion.predecir(usuario, topK, algoritmo);
        res.json({
            success: true,
            usuario,
            metodo: algoritmo,
            recomendaciones,
            total: recomendaciones.length
        });
    }
    catch (error) {
        console.error('Error generando recomendaciones:', error);
        res.status(500).json({
            success: false,
            error: 'Error generando recomendaciones'
        });
    }
}));
/**
 * GET /api/recomendaciones/producto/:producto
 * Obtiene productos similares a uno dado
 */
RouterPrediccion.get('/producto/:producto', validarProducto, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { producto } = req.params;
        const { limite = '5' } = req.query;
        const topK = parseInt(limite);
        if (isNaN(topK) || topK <= 0 || topK > 50) {
            res.status(400).json({
                success: false,
                error: 'El límite debe ser un número entre 1 y 50'
            });
        }
        const productosSimiliares = yield sistemaRecomendacion.recomendarPorProducto(producto, topK);
        res.json({
            success: true,
            producto,
            similares: productosSimiliares,
            total: productosSimiliares.length
        });
    }
    catch (error) {
        console.error('Error buscando productos similares:', error);
        res.status(500).json({
            success: false,
            error: 'Error buscando productos similares'
        });
    }
}));
// ==============================
// 🚀 RUTAS DE INFORMACIÓN
// ==============================
/**
 * GET /api/recomendaciones/estadisticas
 * Obtiene estadísticas del sistema
 */
RouterPrediccion.get('/estadisticas', (_req, res) => {
    try {
        const estadisticas = sistemaRecomendacion.obtenerEstadisticas();
        res.json({
            success: true,
            estadisticas
        });
    }
    catch (error) {
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
RouterPrediccion.get('/salud', (_req, res) => {
    const estadisticas = sistemaRecomendacion.obtenerEstadisticas();
    res.json({
        success: true,
        estado: 'activo',
        version: '1.0.0',
        inicializado: estadisticas.inicializado,
        timestamp: new Date().toISOString()
    });
});
RouterPrediccion.post("/usuario/recomendar", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const compras = req.body.compras;
        const { id_usuario } = req.body;
        const connection = yield db_1.db.getConnection();
        if (!compras || compras.length === 0) {
            const [resultItems] = yield connection.query(`SELECT 
    pi.cantidad,
    ps.sku,
    pb.nombre_variante
FROM 
    pedido_items pi
JOIN 
    pedidos p ON p.id = pi.pedido_id
JOIN 
    productos_sku ps ON ps.id = pi.producto_id
JOIN
    variantes pb ON ps.variante_id = pb.id
WHERE 
    p.usuario_id = ?;
`, [id_usuario]);
            if (!resultItems) {
                const { populares } = yield sistemaRecomendacion.agregarUsuario(compras);
                res.json({
                    mensaje: "✅ Usuario agregado y modelo actualizado",
                    recomendaciones: null,
                    populares
                });
            }
            const transformados = resultItems.map((item) => ({
                usuario: id_usuario,
                producto: `${item.sku} - ${item.nombre_variante}`,
                cantidad: item.cantidad
            }));
            console.log(transformados);
            const { prediccionesall, populares } = yield sistemaRecomendacion.agregarUsuario(transformados);
            res.json({
                mensaje: "✅ Usuario agregado y modelo actualizado",
                recomendaciones: prediccionesall,
                populares
            });
            console.log(prediccionesall);
            return;
        }
        const { prediccionesall, populares } = yield sistemaRecomendacion.agregarUsuario(compras);
        res.json({
            mensaje: "✅ Usuario agregado y modelo actualizado",
            recomendaciones: prediccionesall,
            populares
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
exports.default = RouterPrediccion;

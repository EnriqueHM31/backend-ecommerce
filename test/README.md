# Tests del Backend E-commerce

Este directorio contiene los tests unitarios para el backend del e-commerce.

## Estructura

```
test/
├── controllers/          # Tests para controladores
│   └── pedidos.test.ts   # Tests del controlador de pedidos
├── utils/                # Tests para utilidades
│   └── validaciones.test.ts # Tests de validaciones
├── __mocks__/            # Mocks para testing
│   ├── supabase.ts       # Mock de Supabase
│   └── @/database/db.ts  # Mock del módulo de DB
├── setup.ts              # Configuración global de tests
├── tsconfig.json         # Configuración TypeScript para tests
└── README.md             # Este archivo
```

## Scripts Disponibles

- `npm test` - Ejecutar todos los tests
- `npm run test:watch` - Ejecutar tests en modo watch
- `npm run test:coverage` - Ejecutar tests con reporte de cobertura

## Tests Incluidos

### Controlador de Pedidos (5 tests)
1. **crearPedido sin checkout_session_id** - Valida error 400 cuando falta el ID de sesión
2. **crearPedido exitoso** - Valida creación exitosa de pedido
3. **crearPedido duplicado** - Valida manejo de pedidos duplicados
4. **crearPedido con error** - Valida manejo de errores del modelo
5. **obtenerPedidosPorId** - Valida obtención de pedidos por usuario
6. **actualizarCompraEstado** - Valida actualización de estado de pedido

### Validaciones Utils (3 tests)
1. **CartItemsValidation** - Valida items del carrito (cantidad válida/inválida)
2. **UsuarioValidation** - Valida datos de usuario (campos requeridos)
3. **validarComentario** - Valida comentarios (nombre y mensaje requeridos)

## Configuración

Los tests utilizan:
- **Jest** como framework de testing
- **ts-jest** para soporte de TypeScript
- **Supertest** para testing de APIs (instalado pero no utilizado en estos tests básicos)
- **Mocks** para aislar las dependencias externas

## Ejecutar Tests

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar con cobertura
npm run test:coverage
```

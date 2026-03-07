require('dotenv').config();
const express = require('express');
const imaps = require('imap-simple');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// RUTA 1: DISNEY - ACCESO (INTACTA)
// ==========================================
app.post('/buscar-correo', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [
            ['FROM', 'disneyplus@trx.mail2.disneyplus.com'],
            ['HEADER', 'SUBJECT', 'Tu código de acceso único para Disney+'],
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            const rawBody = messages[messages.length - 1].parts[0].body;
            let textoLimpio = rawBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/=\r?\n/g, '').replace(/=[0-9A-F]{2}/gi, ' ');
            
            const regexCodigo = /\b\d{6}\b/g; 
            const coincidencias = textoLimpio.match(regexCodigo);

            if (coincidencias) {
                const codigosReales = coincidencias.filter(num => num !== '707070' && num !== '000000');
                if (codigosReales.length > 0) {
                    res.json({ success: true, tipo: 'codigo', resultado: [...new Set(codigosReales)].join('   |   ') });
                } else {
                    res.json({ success: true, tipo: 'error', resultado: "Solo se encontraron colores." });
                }
            } else {
                res.json({ success: true, tipo: 'error', resultado: "No se detectaron 6 dígitos." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró un código de acceso para: ${email_usuario}` });
        }
        connection.end();
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno del servidor." });
    }
});

// ==========================================
// RUTA 2: DISNEY - HOGAR (INTACTA)
// ==========================================
app.post('/buscar-enlace-hogar', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [
            ['FROM', 'disneyplus@trx.mail2.disneyplus.com'],
            ['HEADER', 'SUBJECT', 'Hogar'],
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            const rawBody = messages[messages.length - 1].parts[0].body;
            let textoLimpio = rawBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/=\r?\n/g, '').replace(/=[0-9A-F]{2}/gi, ' ');
            
            const regexCodigo = /\b\d{6}\b/g; 
            const coincidencias = textoLimpio.match(regexCodigo);

            if (coincidencias) {
                const codigosReales = coincidencias.filter(num => num !== '707070' && num !== '000000');
                if (codigosReales.length > 0) {
                    res.json({ success: true, tipo: 'codigo', resultado: [...new Set(codigosReales)].join('   |   ') });
                } else {
                    res.json({ success: true, tipo: 'error', resultado: "Solo se encontraron colores." });
                }
            } else {
                res.json({ success: true, tipo: 'error', resultado: "No se detectaron 6 dígitos." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró el correo de Actualización de Hogar para: ${email_usuario}` });
        }
        connection.end();
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno del servidor." });
    }
});

// ==========================================
// RUTA 3: VIX - ENLACE DE CONTRASEÑA (NUEVA)
// ==========================================
app.post('/buscar-enlace-vix', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        // BÚSQUEDA ESPECÍFICA:
        // 1. Remitente: vix@vix.com
        // 2. Título contenga: contraseña (para atrapar "restablecer" o "cambiar")
        // 3. Dirigido al alias del cliente
        const searchCriteria = [
            ['FROM', 'vix@vix.com'],
            ['HEADER', 'SUBJECT', 'contraseña'], 
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            // Obtenemos el último correo (el más nuevo)
            const rawBody = messages[messages.length - 1].parts[0].body;
            
            // RASTREADOR DE ENLACES: Buscamos todas las URLs completas (https://...)
            const regexEnlaces = /href="(https:\/\/[^"]+)"/gi;
            const enlacesEncontrados = [...rawBody.matchAll(regexEnlaces)].map(m => m[1]);

            // FILTRO DE ENLACES: Buscamos un enlace que sea de Vix pero que NO sea basura (legal, privacidad, etc.)
            const enlaceReal = enlacesEncontrados.find(link => 
                !link.includes('privacy') && 
                !link.includes('legal') && 
                !link.includes('support') && 
                link.includes('vix')
            );

            if (enlaceReal) {
                // Lo enviamos como tipo 'enlace' para que el HTML cree el botón verde
                res.json({ success: true, tipo: 'enlace', resultado: enlaceReal });
            } else {
                res.json({ success: true, tipo: 'error', resultado: "Se encontró el correo de Vix, pero no pudimos extraer el enlace de confirmación." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró un correo de cambio de contraseña de Vix para: ${email_usuario}` });
        }
        connection.end();
    } catch (error) {
        console.error("Error Vix:", error);
        res.status(500).json({ success: false, error: "Error interno en el servidor para Vix." });
    }
});

function obtenerConfiguracion() {
    return {
        imap: {
            user: process.env.EMAIL_USER,
            password: process.env.EMAIL_PASS,
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false },
            authTimeout: 3000
        }
    };
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Servidor corriendo en el puerto ${PORT}`); });

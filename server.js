require('dotenv').config();
const express = require('express');
const imaps = require('imap-simple');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// RUTA 1: BUSCAR CÓDIGO DE 6 DÍGITOS
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
            res.json({ success: false, mensaje: `No se encontró un código reciente para: ${email_usuario}` });
        }
        connection.end();
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno del servidor." });
    }
});

// ==========================================
// RUTA 2: BUSCAR ENLACE DE HOGAR (AMPLIADA)
// ==========================================
app.post('/buscar-enlace-hogar', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        // BÚSQUEDA AMPLIA: Cualquier correo que contenga "disney" en el remitente
        const searchCriteria = [
            ['FROM', 'disney'],
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            let enlaceEncontrado = null;
            
            // Revisamos los últimos 3 correos de Disney de más nuevo a más viejo
            const limite = Math.max(0, messages.length - 3);
            for (let i = messages.length - 1; i >= limite; i--) {
                const rawBody = messages[i].parts[0].body;
                
                // Extraemos todos los enlaces ocultos en el correo
                const regexEnlaces = /href="(https:\/\/[^"]+)"/gi;
                const enlaces = [...rawBody.matchAll(regexEnlaces)].map(m => m[1]);

                // Buscamos un enlace que sea de Disney pero que NO sea de ayuda o legal
                const enlaceUtil = enlaces.find(link => 
                    !link.includes('privacy') && 
                    !link.includes('help') && 
                    !link.includes('legal') &&
                    !link.includes('support') &&
                    !link.includes('preferences') &&
                    link.includes('disney')
                );

                if (enlaceUtil) {
                    enlaceEncontrado = enlaceUtil;
                    break; // Ya lo encontramos, salimos
                }
            }

            if (enlaceEncontrado) {
                res.json({ success: true, tipo: 'enlace', resultado: enlaceEncontrado });
            } else {
                res.json({ success: true, tipo: 'error', resultado: "Se encontró el correo, pero no se pudo extraer el botón. Asegúrate de que tenga un enlace." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró el correo de Actualización de Hogar para: ${email_usuario}` });
        }
        connection.end();
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno del servidor." });
    }
});

// Función para no repetir la configuración
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

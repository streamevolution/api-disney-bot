require('dotenv').config();
const express = require('express');
const imaps = require('imap-simple');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// RUTA 1: CÓDIGO DE ACCESO (ESTABLE - NO TOCADO)
// ==========================================
app.post('/buscar-correo', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [
            ['FROM', 'disneyplus@trx.mail2.disneyplus.com'],
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
            res.json({ success: false, mensaje: `No se encontró un correo reciente para: ${email_usuario}` });
        }
        connection.end();
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno." });
    }
});

// ==========================================
// RUTA 2: ACTUALIZAR HOGAR (NUEVA LÓGICA CORREGIDA)
// ==========================================
app.post('/buscar-enlace-hogar', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [
            ['FROM', 'disneyplus@trx.mail2.disneyplus.com'],
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            let codigoHogar = null;
            
            // Revisamos los últimos 5 correos
            const limite = Math.max(0, messages.length - 5);
            for (let i = messages.length - 1; i >= limite; i--) {
                const rawBody = messages[i].parts[0].body;

                // 1. LIMPIAMOS EL TEXTO PRIMERO (Para evitar que la palabra Hogar esté rota)
                let textoLimpio = rawBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
                                         .replace(/<[^>]+>/g, ' ')
                                         .replace(/=\r?\n/g, '')
                                         .replace(/=[0-9A-F]{2}/gi, ' ');

                // 2. AHORA BUSCAMOS LAS PALABRAS CLAVE EN EL TEXTO LIMPIO
                if (textoLimpio.toLowerCase().includes('hogar') || textoLimpio.toLowerCase().includes('actualizar')) {
                    
                    const regexCodigo = /\b\d{6}\b/g;
                    const coincidencias = textoLimpio.match(regexCodigo);

                    if (coincidencias) {
                        const codigosReales = coincidencias.filter(num => num !== '707070' && num !== '000000');
                        if (codigosReales.length > 0) {
                            codigoHogar = [...new Set(codigosReales)].join('   |   ');
                            break; // Encontramos el código, detenemos la búsqueda
                        }
                    }
                }
            }

            if (codigoHogar) {
                res.json({ success: true, tipo: 'codigo', resultado: codigoHogar });
            } else {
                res.json({ success: true, tipo: 'error', resultado: "No se encontró la solicitud de Hogar en la bandeja." });
            }
        } else {
            res.json({ success: false, mensaje: `No hay correos de Disney para: ${email_usuario}` });
        }
        connection.end();
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno del servidor." });
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

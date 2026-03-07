require('dotenv').config();
const express = require('express');
const imaps = require('imap-simple');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// RUTA 1: CÓDIGO DE ACCESO DISNEY (INTACTA)
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
// RUTA 2: ACTUALIZAR HOGAR DISNEY (INTACTA)
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
                res.json({ success: true, tipo: 'error', resultado: "No se detectaron 6 dígitos en el correo de hogar." });
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
// RUTA 3: CÓDIGO DE VIX (NUEVA)
// ==========================================
app.post('/buscar-vix', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        // Busca cualquier correo que venga del dominio vix.com
        const searchCriteria = [
            ['FROM', 'vix.com'],
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            const rawBody = messages[messages.length - 1].parts[0].body;
            let textoLimpio = rawBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/=\r?\n/g, '').replace(/=[0-9A-F]{2}/gi, ' ');
            
            // Vix a veces usa 4 números, a veces 6. Buscamos números de 4 a 6 dígitos seguidos.
            const regexCodigo = /\b\d{4,6}\b/g; 
            const coincidencias = textoLimpio.match(regexCodigo);

            if (coincidencias) {
                const codigosReales = coincidencias.filter(num => num !== '707070' && num !== '000000');
                if (codigosReales.length > 0) {
                    res.json({ success: true, tipo: 'codigo', resultado: [...new Set(codigosReales)].join('   |   ') });
                } else {
                    res.json({ success: true, tipo: 'error', resultado: "No se detectaron números válidos de Vix." });
                }
            } else {
                res.json({ success: true, tipo: 'error', resultado: "No se detectaron códigos en el correo de Vix." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró un código reciente de Vix para: ${email_usuario}` });
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

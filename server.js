require('dotenv').config();
const express = require('express');
const imaps = require('imap-simple');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/buscar-correo', async (req, res) => {
    const { email_usuario } = req.body; 

    const config = {
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

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        // NUEVO FILTRO SÚPER ESPECÍFICO
        // 1. Remitente exacto
        // 2. Asunto exacto (Ideal para agregar códigos de hogar después)
        // 3. Dirigido al correo o alias (+3) que pongas en la página
        const searchCriteria = [
            ['FROM', 'disneyplus@trx.mail2.disneyplus.com'],
            ['HEADER', 'SUBJECT', 'Tu código de acceso único para Disney+'],
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            const ultimoMensaje = messages[messages.length - 1];
            const rawBody = ultimoMensaje.parts[0].body;

            // ELIMINADOR DE DISEÑO (Solución al 707070)
            // 1. Borra todas las etiquetas HTML (incluyendo colores como #707070)
            let textoLimpio = rawBody.replace(/<[^>]+>/g, ' ');
            // 2. Borra basura de codificación como los =20
            textoLimpio = textoLimpio.replace(/=\r?\n/g, '').replace(/=[0-9A-F]{2}/g, ' ');

            // Ahora sí, buscamos los 6 dígitos reales en el texto limpio
            const regexCodigo = /\b\d{6}\b/;
            const coincidencia = textoLimpio.match(regexCodigo);

            if (coincidencia) {
                res.json({ success: true, codigo: coincidencia[0] });
            } else {
                res.json({ success: true, codigo: "No se detectó el código en el texto. Revisa tu bandeja." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró el mensaje "Tu código de acceso único para Disney+" para: ${email_usuario}` });
        }

        connection.end();

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, error: "Error interno del servidor." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});

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

            // Limpieza básica
            let textoLimpio = rawBody.replace(/<[^>]+>/g, ' ').replace(/=\r?\n/g, '').replace(/=[0-9A-F]{2}/g, ' ');

            // EL TRUCO MAESTRO: Buscar TODOS los códigos de 6 dígitos con la letra "g" al final del regex
            const regexCodigo = /\b\d{6}\b/g; 
            const coincidencias = textoLimpio.match(regexCodigo);

            if (coincidencias) {
                // Filtramos los números que sabemos que son colores de diseño (707070)
                const codigosReales = coincidencias.filter(numero => numero !== '707070' && numero !== '000000');

                if (codigosReales.length > 0) {
                    // Nos da el primer código real que encontró
                    res.json({ success: true, codigo: codigosReales[0] });
                } else {
                    res.json({ success: true, codigo: "Solo se encontraron códigos de color, no el de acceso." });
                }
            } else {
                res.json({ success: true, codigo: "No se detectaron 6 dígitos en el texto." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró un código reciente para: ${email_usuario}` });
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

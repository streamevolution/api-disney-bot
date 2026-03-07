require('dotenv').config();
const express = require('express');
const imaps = require('imap-simple');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/buscar-correo', async (req, res) => {
    // Recibimos el correo que escribiste en tu página web
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

        // NUEVO FILTRO: Buscar correos de Disney+ dirigidos AL correo que escribiste en la página
        const searchCriteria = [
            ['FROM', 'disneyplus.com'],
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            const ultimoMensaje = messages[messages.length - 1];
            const rawBody = ultimoMensaje.parts[0].body;

            // FILTRO INTELIGENTE: Buscar exactamente 6 números seguidos dentro de todo el código HTML
            const regexCodigo = /\b\d{6}\b/;
            const coincidencia = rawBody.match(regexCodigo);

            if (coincidencia) {
                // Si encuentra los 6 números, te manda solo el código
                res.json({ success: true, codigo: coincidencia[0] });
            } else {
                // Si no encuentra números (por si Disney cambia el formato)
                res.json({ success: true, codigo: "No se detectaron los 6 dígitos. Revisa tu bandeja." });
            }
        } else {
            res.json({ success: false, mensaje: `No hay correos recientes de Disney para: ${email_usuario}` });
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

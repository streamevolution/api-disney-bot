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

            // LIMPIEZA EXTREMA
            // 1. Destruimos todo el bloque de estilos donde se esconden los colores
            let textoLimpio = rawBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
            // 2. Destruimos el resto del diseño web
            textoLimpio = textoLimpio.replace(/<[^>]+>/g, ' ');
            // 3. Limpiamos caracteres basura
            textoLimpio = textoLimpio.replace(/=\r?\n/g, '').replace(/=[0-9A-F]{2}/gi, ' ');

            // Buscamos cualquier combinación de 6 números
            const regexCodigo = /\b\d{6}\b/g; 
            const coincidencias = textoLimpio.match(regexCodigo);

            if (coincidencias) {
                // Filtramos colores conocidos que se hayan escapado
                const codigosReales = coincidencias.filter(num => num !== '707070' && num !== '000000');

                if (codigosReales.length > 0) {
                    // Eliminamos números repetidos (a veces el código viene 2 veces en el correo)
                    const codigosUnicos = [...new Set(codigosReales)];
                    
                    // Si encuentra varios números de 6 dígitos, te los muestra todos juntos separados por una línea
                    const resultadoFinal = codigosUnicos.join('   |   ');
                    
                    res.json({ success: true, codigo: resultadoFinal });
                } else {
                    res.json({ success: true, codigo: "Solo se encontraron colores." });
                }
            } else {
                res.json({ success: true, codigo: "No se detectaron 6 dígitos." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró un correo reciente para: ${email_usuario}` });
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

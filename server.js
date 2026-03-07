require('dotenv').config();
const express = require('express');
const imaps = require('imap-simple');
const cors = require('cors');

const app = express();

// Permite que tu frontend HTML se comunique sin bloqueos de seguridad en el navegador
app.use(cors());
// Permite que el servidor entienda los datos que le mandas en formato JSON
app.use(express.json());

app.post('/buscar-correo', async (req, res) => {
    // 1. Configuramos la conexión usando las Variables de Entorno de Railway
    const config = {
        imap: {
            user: process.env.EMAIL_USER,
            password: process.env.EMAIL_PASS,
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false }, // Evita errores de certificado en servidores externos
            authTimeout: 3000
        }
    };

    try {
        console.log("Conectando a la bandeja de entrada...");
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        // 2. Criterio de búsqueda: Todos los correos que vengan de disneyplus.com
        // Si quisieras SOLO los no leídos, cambiarías esto a: ['UNSEEN', ['FROM', 'disneyplus.com']]
        const searchCriteria = [['FROM', 'disneyplus.com']];
        
        // 3. Opciones de descarga: Traer el texto y no marcarlo como leído automáticamente
        const fetchOptions = {
            bodies: ['TEXT'],
            markSeen: false 
        };

        console.log("Buscando mensajes de Disney+...");
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            // 4. Seleccionamos el mensaje más reciente (el último de la lista)
            const ultimoMensaje = messages[messages.length - 1];
            
            // 5. Extraemos el código fuente o texto del mensaje
            const rawCode = ultimoMensaje.parts[0].body;

            // Enviamos el éxito y el código de vuelta a tu página HTML
            res.json({ success: true, codigo: rawCode });
        } else {
            res.json({ success: false, mensaje: "No se encontraron correos de Disney+ en esta bandeja." });
        }

        // Cerramos la conexión con el correo
        connection.end();

    } catch (error) {
        console.error("Error en el servidor:", error);
        res.status(500).json({ 
            success: false, 
            error: "Error interno: Revisa que tu EMAIL_USER y EMAIL_PASS estén correctos en Railway." 
        });
    }
});

// 6. Iniciamos el servidor en el puerto que asigne Railway (o el 3000 de forma local)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo exitosamente en el puerto ${PORT}`);
});

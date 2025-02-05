const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const session = require("express-session");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Configurar sesiones
const sessionMiddleware = session({
    secret: "secreto-captcha",
    resave: false,
    saveUninitialized: true,
});

// Middleware para Express y Socket.io
app.use(sessionMiddleware);
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

// Función para generar captcha
function generateCaptcha() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Manejo de conexiones de Socket.io
io.on("connection", (socket) => {
    console.log("Nuevo usuario conectado");

    const session = socket.request.session;

    // Inicializar la sesión si no está autenticado
    if (!session.authenticated) {
        session.authenticated = false;
        session.save();
    }

    // Solicitar captcha
    socket.on("request_captcha", () => {
        if (!session.authenticated) {
            const captcha = generateCaptcha();
            session.captcha = captcha;
            session.save();
            socket.emit("captcha", { captcha, authenticated: false });
        } else {
            socket.emit("captcha", { authenticated: true });
        }
    });

    // Verificar captcha
    socket.on("verify_captcha", (input) => {
        if (input.toUpperCase() === session.captcha) {
            session.authenticated = true;
            session.save();
            socket.emit("captcha_verified", true);
        } else {
            socket.emit("captcha_verified", false);
        }
    });
});

// Servir archivos estáticos desde "public"
app.use(express.static("public"));

// Ruta principal
app.get("/", (req, res) => {
    const session = req.session;
    if (session.authenticated) {
        // Si está autenticado, redirigir a la página de bienvenida
        res.redirect('/welcome');
    } else {
        // Si no está autenticado, no enviar nada
        res.send('');
    }
});

// Ruta de bienvenida
app.get("/welcome", (req, res) => {
    const session = req.session;
    if (session.authenticated) {
        // Si está autenticado, servir el archivo welcome.html
        res.sendFile(path.join(__dirname, "public", "welcome.html"));
    } else {
        // Si no está autenticado, redirigir a la página principal
        res.redirect('/');
    }
});

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

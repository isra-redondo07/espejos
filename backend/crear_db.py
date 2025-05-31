import os
import sqlite3
from passlib.context import CryptContext

# Obtén la ruta absoluta a la raíz del proyecto
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "sql_app.db")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.executescript("""
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio_montura TEXT,
    precio_sin_montura TEXT,
    categoria TEXT,
    badge TEXT,
    ancho TEXT,
    largo TEXT,
    imagenes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS ofertas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    texto TEXT NOT NULL,
    icono TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS configuraciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clave TEXT UNIQUE NOT NULL,
    valor TEXT
);
""")

# Inserta un admin solo si no existe
admin_email = "Juancarlosmm_0775@hotmail.com"
admin_password = "jumay1330"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hashed_password = pwd_context.hash(admin_password)

cursor.execute("SELECT * FROM admins WHERE email = ?", (admin_email,))
if not cursor.fetchone():
    cursor.execute(
        "INSERT INTO admins (email, hashed_password) VALUES (?, ?)",
        (admin_email, hashed_password)
    )
    print("Administrador por defecto creado.")
else:
    print("El administrador ya existe.")

conn.commit()
conn.close()
print("Base de datos y tablas creadas correctamente.")
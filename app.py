from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, JSON, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from typing import List, Optional
import os
import json
import shutil
from sqlalchemy.orm import Session
from backend.models import Admin, Producto, Oferta, Configuracion
from backend.database import Base, engine, SessionLocal
from fastapi.templating import Jinja2Templates
# Agregar caché para productos
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.decorator import cache
# Agregar rate limiting
from slowapi import Limiter
from slowapi.util import get_remote_address
import uuid

# =================== CONFIGURACIÓN BASE DE DATOS ===================
SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    pool_pre_ping=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# =================== FUNCIÓN DE CONEXIÓN A DB ===================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# =================== MODELOS ===================
class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class Producto(Base):
    __tablename__ = "productos"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    descripcion = Column(Text)
    precio_montura = Column(String)
    precio_sin_montura = Column(String)
    categoria = Column(String)
    badge = Column(String, nullable=True)
    ancho = Column(String, nullable=True)
    largo = Column(String, nullable=True)
    imagenes = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Oferta(Base):
    __tablename__ = "ofertas"
    id = Column(Integer, primary_key=True, index=True)
    texto = Column(String)
    icono = Column(String)

# =================== AUTENTICACIÓN ===================
SECRET_KEY = "tu_super_secreto_aqui_actualiza_esto"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 día

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str):
    return pwd_context.hash(password)

def authenticate_admin(db: Session, email: str, password: str):
    admin = db.query(Admin).filter(Admin.email == email).first()
    if not admin or not verify_password(password, admin.hashed_password):
        return None
    return admin

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    admin = db.query(Admin).filter(Admin.email == email).first()
    if admin is None:
        raise credentials_exception
    return admin

# =================== CONFIGURACIÓN DEL RATE LIMITER ===================
limiter = Limiter(key_func=get_remote_address)

# =================== INICIALIZACIÓN APP ===================
app = FastAPI(
    title="La Galería del Espejo API",
    description="API para la tienda de espejos decorativos",
    version="1.0.0"
)

# Elimina la duplicación del evento startup y simplifica la configuración del caché
@app.on_event("startup")
async def startup():
    try:
        FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")
        print("Caché en memoria inicializado correctamente")
    except Exception as e:
        print(f"Error al inicializar caché: {e}")

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración de rutas estáticas
app.mount("/static", StaticFiles(directory="frontend"), name="static")
app.mount("/img", StaticFiles(directory="frontend/img"), name="img")
app.mount("/css", StaticFiles(directory="frontend/css"), name="css")
app.mount("/js", StaticFiles(directory="frontend/js"), name="js")

@app.get("/")
async def read_root():
    return FileResponse("frontend/templates/index.html")

@app.get("/detalle")
async def read_detail(id: int = None):
    if id is None:
        return FileResponse("frontend/templates/index.html")
    return FileResponse("frontend/templates/detalle.html")

# Agregar manejo de errores más específico
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail}
    )

# =================== RUTAS DE AUTENTICACIÓN ===================
@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    admin = authenticate_admin(db, form_data.username, form_data.password)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )
    access_token = create_access_token(data={"sub": admin.email})
    return {"access_token": access_token, "token_type": "bearer"}

# =================== RUTAS DE PRODUCTOS ===================
    
@app.get("/productos/{producto_id}", response_model=dict)
async def leer_producto_por_id(producto_id: int, db: Session = Depends(get_db)):
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {
        "id": producto.id,
        "nombre": producto.nombre,
        "descripcion": producto.descripcion,
        "precio_montura": producto.precio_montura,
        "precio_sin_montura": producto.precio_sin_montura,
        "categoria": producto.categoria,
        "badge": producto.badge,
        "ancho": producto.ancho,
        "largo": producto.largo,
        "imagenes": json.loads(producto.imagenes) if isinstance(producto.imagenes, str) else producto.imagenes,
        "created_at": producto.created_at.isoformat() if producto.created_at else None,
        "updated_at": producto.updated_at.isoformat() if producto.updated_at else None
    }


@app.get("/productos")
async def get_productos(db: Session = Depends(get_db)):
    print("Petición recibida para /productos") # Debug
    try:
        productos = db.query(Producto).all()
        print(f"Productos encontrados: {len(productos)}") # Debug
        return productos
    except Exception as e:
        print(f"Error: {str(e)}") # Debug
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/productos", status_code=201)
async def crear_producto(
    nombre: str = Form(...),
    descripcion: str = Form(""),
    precio_montura: str = Form(""),
    precio_sin_montura: str = Form(""),
    categoria: str = Form(""),
    badge: str = Form(""),
    ancho: str = Form(""),
    largo: str = Form(""),
    imagenes: list[UploadFile] = File([]),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    rutas = []
    img_dir = os.path.join("frontend", "img")
    os.makedirs(img_dir, exist_ok=True)
    
    for img in imagenes:
        filename = f"{uuid.uuid4()}{os.path.splitext(img.filename)[1]}"
        ruta = os.path.join(img_dir, filename)
        with open(ruta, "wb") as buffer:
            shutil.copyfileobj(img.file, buffer)
        rutas.append(f"/static/img/{filename}")
    
    nuevo = Producto(
        nombre=nombre,
        descripcion=descripcion,
        precio_montura=precio_montura,
        precio_sin_montura=precio_sin_montura,
        categoria=categoria,
        badge=badge,
        ancho=ancho,
        largo=largo,
        imagenes=json.dumps(rutas)
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return {"ok": True, "id": nuevo.id}

@app.put("/productos/{id}")
async def editar_producto(
    id: int,
    nombre: str = Form(...),
    descripcion: str = Form(""),
    precio_montura: str = Form(""),
    precio_sin_montura: str = Form(""),
    categoria: str = Form(""),
    badge: str = Form(""),
    ancho: str = Form(""),
    largo: str = Form(""),
    imagenes: list[UploadFile] = File([]),
    imagenes_a_eliminar: str = Form(""),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    producto = db.query(Producto).filter(Producto.id == id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    rutas = []
    img_dir = os.path.join("frontend", "img")
    os.makedirs(img_dir, exist_ok=True)
    for img in imagenes:
        ruta = os.path.join(img_dir, img.filename)
        with open(ruta, "wb") as buffer:
            shutil.copyfileobj(img.file, buffer)
        rutas.append(f"/frontend/img/{img.filename}")

    if imagenes_a_eliminar:
        eliminar = json.loads(imagenes_a_eliminar)
        imagenes_actuales = json.loads(producto.imagenes) if producto.imagenes else []
        nuevas_imagenes = [img for img in imagenes_actuales if img not in eliminar]
        # Elimina físicamente los archivos si quieres
        for img in eliminar:
            abs_path = os.path.join(os.getcwd(), img.lstrip("/\\"))
            if os.path.exists(abs_path):
                os.remove(abs_path)
        producto.imagenes = json.dumps(nuevas_imagenes)
    # Si no se suben nuevas imágenes, mantener las existentes
    if rutas:
        producto.imagenes = json.dumps(rutas)
    # Si quieres permitir eliminar imágenes, agrega lógica aquí

    producto.nombre = nombre
    producto.descripcion = descripcion
    producto.precio_montura = precio_montura
    producto.precio_sin_montura = precio_sin_montura
    producto.categoria = categoria
    producto.badge = badge
    producto.ancho = ancho
    producto.largo = largo

    db.commit()
    db.refresh(producto)
    return {"ok": True, "id": producto.id}

@app.delete("/productos/{id}")
async def eliminar_producto(
    id: int,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    producto = db.query(Producto).filter(Producto.id == id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Elimina imágenes del disco
    try:
        imagenes = json.loads(producto.imagenes) if producto.imagenes else []
        for img_path in imagenes:
            abs_path = os.path.join(os.getcwd(), img_path.lstrip("/\\"))
            if os.path.exists(abs_path):
                os.remove(abs_path)
    except Exception:
        pass

    db.delete(producto)
    db.commit()
    return {"ok": True}

# =================== RUTAS DE OFERTAS ===================
@app.get("/ofertas/{oferta_id}", response_model=dict)
async def leer_oferta_por_id(oferta_id: int, db: Session = Depends(get_db)):
    oferta = db.query(Oferta).filter(Oferta.id == oferta_id).first()
    if not oferta:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    return {
        "id": oferta.id,
        "texto": oferta.texto,
        "icono": oferta.icono,
    }

@app.get("/ofertas", response_model=List[dict])
async def leer_ofertas(db: Session = Depends(get_db)):
 ofertas = db.query(Oferta).all()
 return [{"id": o.id, "texto": o.texto, "icono": o.icono} for o in ofertas]


@app.post("/ofertas", status_code=status.HTTP_201_CREATED)
async def crear_oferta(
    texto: str = Form(...),
    icono: str = Form(...),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    oferta = Oferta(texto=texto, icono=icono)
    db.add(oferta)
    db.commit()
    db.refresh(oferta)
    return oferta

@app.put("/ofertas/{oferta_id}")
async def actualizar_oferta(
    oferta_id: int,
    texto: str = Form(...),
    icono: str = Form(...),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    oferta = db.query(Oferta).filter(Oferta.id == oferta_id).first()
    if not oferta:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    
    oferta.texto = texto
    oferta.icono = icono
    
    db.commit()
    db.refresh(oferta)
    
    return oferta

@app.delete("/ofertas/{oferta_id}")
async def eliminar_oferta(
    oferta_id: int,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    oferta = db.query(Oferta).filter(Oferta.id == oferta_id).first()
    if not oferta:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    
    db.delete(oferta)
    db.commit()
    
    return {"message": "Oferta eliminada correctamente"}

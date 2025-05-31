# backend/models.py
from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from .database import Base  # Importación relativa ✅

class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class Producto(Base):
    __tablename__ = "productos"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    descripcion = Column(Text)  # Cambiado a Text
    precio_montura = Column(String)
    precio_sin_montura = Column(String)
    categoria = Column(String)
    badge = Column(String, nullable=True)
    ancho = Column(String, nullable=True)
    largo = Column(String, nullable=True)
    imagenes = Column(Text)  # O Column(JSON) si SQLite lo soporta
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Configuracion(Base):
    __tablename__ = "configuracion"
    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String, unique=True, index=True)
    valor = Column(String)

class Oferta(Base):
    __tablename__ = "ofertas"
    id = Column(Integer, primary_key=True, index=True)
    texto = Column(String)
    icono = Column(String)
from sqlalchemy.orm import Session
from . import models
import sqlite3
import json

def get_admin_by_email(db: Session, email: str):
    return db.query(models.Admin).filter(models.Admin.email == email).first()

def get_productos(db: Session):
    return db.query(models.Producto).all()

def get_producto(db: Session, producto_id: int):
    return db.query(models.Producto).filter(models.Producto.id == producto_id).first()

def create_producto(db: Session, producto: dict):
    if isinstance(producto.get('imagenes'), list):
        producto['imagenes'] = json.dumps(producto['imagenes'])
    db_producto = models.Producto(**producto)
    db.add(db_producto)
    db.commit()
    db.refresh(db_producto)
    return db_producto

def update_producto(db: Session, producto_id: int, data: dict):
    producto = db.query(models.Producto).filter(models.Producto.id == producto_id).first()
    if 'imagenes' in data and isinstance(data['imagenes'], list):
        data['imagenes'] = ','.join(data['imagenes'])
    for key, value in data.items():
        setattr(producto, key, value)
    db.commit()
    db.refresh(producto)
    return producto

def delete_producto(db: Session, producto_id: int):
    producto = db.query(models.Producto).filter(models.Producto.id == producto_id).first()
    db.delete(producto)
    db.commit()

def get_config(db: Session, clave: str):
    return db.query(models.Configuracion).filter(models.Configuracion.clave == clave).first()

def set_config(db: Session, clave: str, valor: str):
    config = get_config(db, clave)
    if config:
        config.valor = valor
    else:
        config = models.Configuracion(clave=clave, valor=valor)
        db.add(config)
    db.commit()
    db.refresh(config)
    return config

def get_ofertas(db: Session):
    return db.query(models.Oferta).all()  # Devuelve la lista de ofertas

def create_oferta(db: Session, data: dict):
    oferta = models.Oferta(**data)
    db.add(oferta)
    db.commit()
    db.refresh(oferta)
    return oferta

def update_oferta(db: Session, oferta_id: int, data: dict):
    oferta = db.query(models.Oferta).filter(models.Oferta.id == oferta_id).first()
    for key, value in data.items():
        setattr(oferta, key, value)
    db.commit()
    db.refresh(oferta)
    return oferta

def delete_oferta(db: Session, oferta_id: int):
    oferta = db.query(models.Oferta).filter(models.Oferta.id == oferta_id).first()
    db.delete(oferta)
    db.commit()
# backend/create_admin.py
from backend.database import Base, engine, SessionLocal
from backend.models import Admin
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_admin(email: str, password: str):
    db = SessionLocal()
    try:
        # Verificar si el admin ya existe
        existing_admin = db.query(Admin).filter(Admin.email == email).first()
        if existing_admin:
            print(f"El administrador con email {email} ya existe")
            return existing_admin
        
        # Crear nuevo admin
        hashed_password = pwd_context.hash(password)
        new_admin = Admin(email=email, hashed_password=hashed_password)
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        print(f"Administrador {email} creado exitosamente")
        return new_admin
    except Exception as e:
        db.rollback()
        print(f"Error al crear administrador: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    # Datos del administrador (puedes modificar estos valores)
    admin_email = "Juancarlosmm_0775@hotmail.com"
    admin_password = "jumay1330" 
    
    create_admin(admin_email, admin_password)
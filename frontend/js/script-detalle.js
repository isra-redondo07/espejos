function getIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function cargarDetalleProducto() {
    try {
        const id = getIdFromUrl();
        if (!id) return;

        const response = await fetch(`/productos/${id}`);
        if (!response.ok) throw new Error('Error al cargar el producto');
        
        const producto = await response.json();
        console.log('Producto cargado:', producto); // Debug

        // Actualizar contenido del producto
        document.querySelector('.nombre-producto').textContent = producto.nombre;
        document.querySelector('.descripcion').innerHTML = producto.descripcion || '';
        document.querySelector('.Dimensiones span:first-child').textContent = producto.ancho || '-';
        document.querySelector('.Dimensiones span:last-child').textContent = producto.largo || '-';
        document.querySelector('.opciones-montura p:first-child span').textContent = producto.precio_montura || '0';
        document.querySelector('.opciones-montura p:last-child span').textContent = producto.precio_sin_montura || '0';

        // Mostrar badge si existe
        const badgeElement = document.querySelector('.badge');
        if (producto.badge) {
            badgeElement.textContent = producto.badge;
            badgeElement.style.display = 'block';
        } else {
            badgeElement.style.display = 'none';
        }

        // Cargar imagen del producto
        cargarImagenProducto(producto);

        // Configurar botones
        configurarBotones(producto);

    } catch (error) {
        console.error('Error:', error);
    }
}

function cargarImagenProducto(producto) {
    const imgProducto = document.getElementById('imagen-producto');
    if (!imgProducto) return;

    let imagen = '/static/img/placeholder.jpg';
    
    try {
        let imagenes = typeof producto.imagenes === 'string' ? 
            JSON.parse(producto.imagenes) : producto.imagenes || [];
        
        if (imagenes.length > 0) {
            imagen = corregirRutaImagen(imagenes[0]);
        }
        console.log('Ruta de imagen:', imagen); // Debug
    } catch (e) {
        console.error('Error procesando imagen:', e);
    }

    imgProducto.src = imagen;
    imgProducto.alt = producto.nombre;
}

function configurarBotones(producto) {
    // Botón comprar
    const btnComprar = document.getElementById('btn-comprar');
    if (btnComprar) {
        btnComprar.onclick = () => {
            const modalCompra = document.getElementById('modal-compra');
            if (modalCompra) {
                document.getElementById('producto').value = producto.nombre;
                modalCompra.style.display = 'block';
            }
        };
    }

    // Botón compartir
    const btnCompartir = document.getElementById('btn-compartir');
    if (btnCompartir) {
        btnCompartir.onclick = async () => {
            const url = window.location.href;
            try {
                if (navigator.share) {
                    await navigator.share({
                        title: producto.nombre,
                        text: `¡Mira este espejo: ${producto.nombre}!`,
                        url: url
                    });
                } else {
                    compartirPorWhatsApp(producto.nombre, url);
                }
            } catch (error) {
                console.error('Error al compartir:', error);
                compartirPorWhatsApp(producto.nombre, url);
            }
        };
    }

    // Configurar formulario de compra
    setupFormularioCompra();
}

function setupFormularioCompra() {
    const formCompra = document.getElementById('form-compra');
    const modalCompra = document.getElementById('modal-compra');

    if (formCompra) {
        formCompra.onsubmit = (e) => {
            e.preventDefault();
            const formData = new FormData(formCompra);
            const mensaje = `*Nuevo Pedido*%0A
Producto: ${formData.get('producto')}%0A
Cliente: ${formData.get('nombre')} ${formData.get('apellido')}%0A
Ubicación: ${formData.get('ubicacion')}%0A
Teléfono: ${formData.get('telefono')}%0A
Método de pago: ${formData.get('pago')}`;

            window.open(`https://wa.me/573053646901?text=${mensaje}`, '_blank');
            modalCompra.style.display = 'none';
            formCompra.reset();
        };
    }

    // Configurar cierre del modal
    const cerrarModal = document.querySelector('.cerrar-modal-compra');
    if (cerrarModal) {
        cerrarModal.onclick = () => {
            modalCompra.style.display = 'none';
        };
    }
}

function mostrarLightbox(src) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    if (lightbox && lightboxImg) {
        lightboxImg.src = src;
        lightbox.style.display = 'block';
    }
}

function corregirRutaImagen(ruta) {
    if (!ruta) return '/static/img/placeholder.jpg';
    if (ruta.startsWith('http')) return ruta;
    if (ruta.startsWith('/frontend/')) return ruta.replace('/frontend/', '/static/');
    if (!ruta.startsWith('/')) return `/static/img/${ruta}`;
    return ruta;
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    cargarDetalleProducto();
    
    // Configurar cierre del lightbox
    const lightbox = document.getElementById('lightbox');
    const closeLightbox = document.querySelector('.lightbox .close');
    if (lightbox && closeLightbox) {
        closeLightbox.onclick = () => {
            lightbox.style.display = 'none';
        };
    }
});
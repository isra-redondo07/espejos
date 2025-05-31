// ================== UTILIDADES ==================
let imagenesAEliminar = [];

function verificarToken() {
    const token = localStorage.getItem("adminToken");
    return !!token;
}

function corregirRutaImagen(ruta) {
    console.log('Ruta original:', ruta); // Debug
    if (!ruta) return '/static/img/placeholder.jpg';
    if (ruta.startsWith('http')) return ruta;
    if (ruta.startsWith('/frontend/')) return ruta.replace('/frontend/', '/static/');
    if (!ruta.startsWith('/')) return `/static/img/${ruta}`;
    return ruta;
}

// ================== INICIALIZACIÓN ==================
document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM cargado");
    inicializarComponentes();
});

function inicializarComponentes() {
    console.log("Inicializando componentes..."); // Debug
    setupMenuResponsive();
    cargarProductos();
    cargarOfertasCarrusel();
    setupFiltros();
    setupCompra(); // Asegúrate de que esta línea esté presente
    setupAdmin();
    setupAdminTabs();
    setupOfertasAdmin();
    setupCerrarModales();
}



// ================== MENU RESPONSIVE ==================
function setupMenuResponsive() {
    const menuToggle = document.getElementById("menu-toggle");
    const navMenu = document.querySelector("#nav ul");
    
    menuToggle?.addEventListener("click", () => {
        navMenu?.classList.toggle("activo");
        menuToggle.classList.toggle("activo");
    });

    navMenu?.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            navMenu.classList.remove("activo");
            menuToggle?.classList.remove("activo");
        });
    });
}

// ================== PANEL DE ADMINISTRADOR ==================
function setupAdmin() {
    const adminBtn = document.getElementById("adminBtn");
    const adminModal = document.getElementById("adminModal");
    const adminPanel = document.getElementById("adminPanel");

    // Botón para abrir modal de login
    adminBtn?.addEventListener("click", function (e) {
        e.preventDefault();
        adminModal.style.display = "flex";
        if (adminPanel) adminPanel.style.display = "none";
    });

    // Cerrar modal admin y panel admin
    document.querySelectorAll('.cerrar-admin, .cerrar-panel-admin').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('cerrar-admin')) {
                adminModal.style.display = "none";
            } else if (btn.classList.contains('cerrar-panel-admin')) {
                adminPanel.style.display = "none";
            }
        });
    });

    setupAdminLogin();

    // Configurar formulario de producto
    const productForm = document.getElementById("productForm");
    if (productForm) {
        productForm.addEventListener("submit", handleProductForm);
    }

    // Configurar botón de agregar producto
    const addProductBtn = document.getElementById("addProductBtn");
    if (addProductBtn) {
        addProductBtn.addEventListener("click", () => {
            console.log("Abriendo modal de nuevo producto"); // Debug
            const modal = document.getElementById("productModal");
            if (modal) {
                document.getElementById("productForm").reset();
                document.getElementById("productId").value = '';
                document.getElementById("productModalTitle").textContent = "Nuevo Espejo";
                document.getElementById("productImagesPreview").innerHTML = '';
                imagenesAEliminar = [];
                modal.style.display = "block";
            }
        });
    }
}

function setupAdminLogin() {
    const loginForm = document.getElementById("loginForm");
    if (!loginForm) return;

    loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = document.getElementById("adminEmail").value;
        const password = document.getElementById("adminPassword").value;

        try {
            const res = await fetch("/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
            });

            const data = await res.json();

            if (res.ok && data.access_token) {
                handleSuccessfulLogin(data.access_token);
            } else {
                mostrarErrorLogin();
            }
        } catch (error) {
            mostrarErrorLogin();
        }
    });
}

async function handleSuccessfulLogin(token) {
    localStorage.setItem("adminToken", token);
    document.getElementById("adminModal").style.display = "none";
    const adminPanel = document.getElementById("adminPanel");
    if (adminPanel) {
        adminPanel.style.display = "block";
        await loadAdminProductos();
        await loadAdminOfertas();
        setupAdminPanelButtons(); // Asegúrate de que esta línea esté presente
    }
}

function mostrarErrorLogin() {
    const errorElement = document.getElementById("adminLoginError");
    if (!errorElement) return;
    
    errorElement.style.display = "block";
    setTimeout(() => {
        errorElement.style.display = "none";
    }, 3000);
}

// ================== CARRUSEL DE OFERTAS ==================
function cargarOfertasCarrusel() {
    fetch("/ofertas")
        .then(res => res.json())
        .then(ofertas => {
            const slider = document.getElementById("ofertas");
            if (!slider) return;
            slider.innerHTML = ofertas.map((oferta, idx) => `
                <div class="slide${idx === 0 ? ' activo' : ''}">
                    <i class="${oferta.icono || 'fas fa-tag'}"></i>
                    <span>${oferta.texto}</span>
                </div>
            `).join('');
            let idx = 0;
            const slides = slider.querySelectorAll('.slide');
            if (slides.length <= 1) return;
            setInterval(() => {
                slides[idx].classList.remove('activo');
                idx = (idx + 1) % slides.length;
                slides[idx].classList.add('activo');
            }, 4000);
        });
}

// ================== FILTRO DE ESPEJOS ==================
function setupFiltros() {
    const botonesFiltro = document.querySelectorAll(".btn-filtro");
    botonesFiltro.forEach(boton => {
        boton.addEventListener("click", function () {
            const categoria = this.getAttribute("data-categoria");
            botonesFiltro.forEach(b => b.classList.remove("activo"));
            this.classList.add("activo");
            filtrarProductos(categoria);
        });
    });
}

function filtrarProductos(categoria) {
    const productos = document.querySelectorAll(".producto");
    productos.forEach(producto => {
        const cat = producto.getAttribute("data-categoria");
        if (categoria === "todos" || cat === categoria) {
            producto.style.display = "block";
        } else {
            producto.style.display = "none";
        }
    });
}

// ================== CARGA DE PRODUCTOS ==================
function cargarProductos() {
    const contenedor = document.querySelector("#productos");
    console.log("Cargando productos..."); // Debug
    
    fetch("/productos")
        .then(res => res.json())
        .then(data => {
            console.log("Productos recibidos:", data); // Debug
            let html = '';
            if (data.length === 0) {
                html += '<p style="text-align:center;">No hay productos disponibles.</p>';
            } else {
                data.forEach(p => {
                    console.log('Producto:', p); // Debug
                    const imagenes = typeof p.imagenes === 'string' ? JSON.parse(p.imagenes) : p.imagenes;
                    console.log('Imágenes:', imagenes); // Debug
                    let primera = imagenes && imagenes.length > 0 ? imagenes[0] : "/static/img/placeholder.jpg";
                    primera = corregirRutaImagen(primera);
                    console.log('Ruta imagen final:', primera); // Debug
                    
                    html += `
                        <div class="producto fade-in" data-categoria="${p.categoria || ''}">
                            <div class="producto-imagen">
                                <img src="${primera}" 
                                     alt="${p.nombre}" 
                                     class="img-catalogo"
                                     onerror="this.src='/static/img/placeholder.jpg'"
                                     style="cursor:pointer;max-width:120px;"
                                     onclick="window.location='/detalle?id=${p.id}'">
                                ${p.badge ? `<div class="producto-badge">${p.badge}</div>` : ""}
                            </div>
                            <div class="producto-contenido">
                                <h3>${p.nombre}</h3>
                                <p class="precio">
                                    Con montura: <span>${p.precio_montura}</span><br>
                                    Sin montura: <span>${p.precio_sin_montura}</span>
                                </p>
                                <button class="comprar" data-producto="${p.nombre}">
                                    <i class="fas fa-shopping-cart"></i> Comprar
                                </button>
                            </div>
                        </div>`;
                });
            }
            contenedor.innerHTML = html;
        })
        .catch(error => {
            console.error("Error al cargar productos:", error);
            contenedor.innerHTML = '<p class="error">Error al cargar los productos</p>';
        });
}

// ================== COMPRA POR WHATSAPP ==================
function setupCompra() {
    // Delegación de eventos para los botones de comprar
    document.addEventListener('click', function(e) {
        if (e.target.matches('.comprar') || e.target.closest('.comprar')) {
            e.preventDefault();
            console.log('Botón comprar clickeado'); // Debug
            
            const btn = e.target.closest('.comprar');
            const producto = btn.dataset.producto;
            
            // Rellenar el modal con la información del producto
            document.getElementById('producto').value = producto;
            
            // Mostrar el modal
            const modalCompra = document.getElementById('modalCompra');
            if (modalCompra) {
                modalCompra.style.display = "block";
                modalCompra.classList.add('activo');
                document.body.style.overflow = "hidden"; // Prevenir scroll
            }
        }
    });

    // Cerrar modal
    document.querySelectorAll('.cerrar-modal-compra, .btn-cancelar').forEach(btn => {
        btn.addEventListener('click', function() {
            const modalCompra = document.getElementById('modalCompra');
            if (modalCompra) {
                modalCompra.style.display = "none";
                modalCompra.classList.remove('activo');
                document.body.style.overflow = ""; // Restaurar scroll
            }
        });
    });

    // Setup del formulario de compra
    const formCompra = document.getElementById('formCompra');
    if (formCompra) {
        formCompra.onsubmit = async function(e) {
            e.preventDefault();
            const producto = document.getElementById("producto").value;
            const nombre = document.getElementById("nombre").value;
            const apellido = document.getElementById("apellido").value;
            const ubicacion = document.getElementById("ubicacion").value;
            const telefono = document.getElementById("telefono").value;
            const pago = document.getElementById("pago").value;
            const mensaje =
                `Hola! Mi nombre es ${nombre} ${apellido}.\n` +
                `Estoy interesado en el espejo: ${producto}\n` +
                `Mi ubicación: ${ubicacion}\n` +
                `Mi teléfono: ${telefono}\n` +
                `Método de pago: ${pago}`;
            const mensajeCodificado = encodeURIComponent(mensaje);
            document.getElementById("confirmarCompra").href =
                `https://wa.me/573053646901?text=${mensajeCodificado}`;
            document.getElementById("modalCompra").classList.remove("activo");
            document.getElementById("modal").classList.add("activo");
        };
    }

    // Cerrar modal de confirmación
    document.querySelectorAll(".cerrar, #modal .cerrar").forEach(btn => {
        btn.addEventListener("click", function () {
            document.getElementById("modal").classList.remove("activo");
            document.body.style.overflow = "";
        });
    });
}

// ================== TABS DEL PANEL ADMIN ==================
function setupAdminTabs() {
    const adminTabs = document.querySelectorAll('.admin-tab');
    const tabContents = document.querySelectorAll('.admin-tab-content');
    adminTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');
            adminTabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const selectedContent = document.getElementById(`${tabId}Tab`);
            if (selectedContent) selectedContent.classList.add('active');
            if (tabId === 'productos') loadAdminProductos();
            if (tabId === 'ofertas') loadAdminOfertas();
            setupAdminPanelButtons(); // Asegúrate de que esta línea esté presente
        });
    });
    // Activar primer tab por defecto
    if (adminTabs.length) adminTabs[0].click();
}

// ================== CERRAR MODALES ==================
function setupCerrarModales() {
    document.addEventListener('click', function(e) {
        // Si el click fue en un botón de cerrar o en el fondo del modal
        if (e.target.matches('.cerrar-modal-compra, .cerrar-admin, .cerrar-product-modal, .cerrar-oferta-modal, .cerrar-panel-admin, .cerrar, .btn-cancelar') || 
            e.target.classList.contains('modal')) {
            
            // Si es el botón de cerrar del panel admin
            if (e.target.classList.contains('cerrar-panel-admin')) {
                const adminPanel = document.getElementById('adminPanel');
                if (adminPanel) {
                    adminPanel.style.display = "none";
                    return;
                }
            }
            
            // Para otros modales
            const modal = e.target.closest('.modal') || e.target;
            if (modal.classList.contains('modal')) {
                modal.style.display = "none";
                modal.classList.remove("activo");
                document.body.style.overflow = "";
            }
        }
    });
}

// ================== ADMIN: PRODUCTOS ==================
async function loadAdminProductos() {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
        console.log("Cargando productos admin..."); // Debug
        const res = await fetch("/productos", {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            throw new Error('Error al cargar productos');
        }

        const productos = await res.json();
        console.log("Productos recibidos:", productos); // Debug

        const lista = document.getElementById("productosList");
        if (!lista) {
            console.error("Lista de productos no encontrada");
            return;
        }

        if (!productos.length) {
            lista.innerHTML = '<div class="no-productos"><p>No hay productos registrados</p></div>';
            return;
        }

        const html = productos.map(p => {
            // Procesar imágenes
            let imagenes = [];
            try {
                imagenes = typeof p.imagenes === 'string' ? JSON.parse(p.imagenes) : (p.imagenes || []);
            } catch (e) {
                console.error('Error parseando imágenes:', e);
            }
            
            const primeraImagen = imagenes.length > 0 ? corregirRutaImagen(imagenes[0]) : '/static/img/placeholder.jpg';
            console.log("Primera imagen:", primeraImagen); // Debug

            return `
                <div class="admin-item" data-id="${p.id}">
                    <div class="admin-item-imagen">
                        <img src="${primeraImagen}" 
                             alt="${p.nombre}"
                             onerror="handleImageError(this)"
                             style="width:100px;height:100px;object-fit:cover;border-radius:4px;">
                    </div>
                    <div class="admin-item-info">
                        <h3>${p.nombre || 'Sin nombre'}</h3>
                        <p>Categoría: ${p.categoria || 'Sin categoría'}</p>
                        <p>Precio con montura: ${p.precio_montura || '0'}</p>
                        <p>Precio sin montura: ${p.precio_sin_montura || '0'}</p>
                    </div>
                    <div class="admin-item-actions">
                        <button onclick="editarProducto(${p.id})" class="btn-editar">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button onclick="deleteProducto(${p.id})" class="btn-eliminar">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>`;
        }).join('');

        lista.innerHTML = html;
        console.log("Lista de productos actualizada"); // Debug
    } catch (error) {
        console.error("Error cargando productos:", error);
        const lista = document.getElementById("productosList");
        if (lista) {
            lista.innerHTML = `
                <div class="error-mensaje">
                    <p>Error al cargar los productos: ${error.message}</p>
                </div>`;
        }
    }
}

// ================== ADMIN: OFERTAS ==================
async function loadAdminOfertas() {
    try {
        const token = localStorage.getItem("adminToken");
        const res = await fetch("/ofertas", {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error al cargar ofertas');
        const ofertas = await res.json();
        const ofertasList = document.getElementById("ofertasList");
        if (!ofertas.length) {
            ofertasList.innerHTML = '<div class="no-ofertas"><p>No hay ofertas registradas</p></div>';
            return;
        }
        ofertasList.innerHTML = ofertas.map(oferta => `
            <div class="oferta-item">
                <div class="oferta-content">
                    <i class="${oferta.icono || 'fas fa-tag'}"></i>
                    <span class="oferta-texto">${oferta.texto}</span>
                </div>
                <div class="oferta-actions">
                    <button onclick="editOferta(${oferta.id})" class="btn-editar">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button onclick="deleteOferta(${oferta.id})" class="btn-eliminar">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        document.getElementById("ofertasList").innerHTML =
            '<p class="error-mensaje">Error al cargar las ofertas</p>';
    }
}

// ================== ADMIN: EDITAR/ELIMINAR OFERTAS ==================
window.editOferta = async function (id) {
    try {
        const token = localStorage.getItem("adminToken");
        const res = await fetch(`/ofertas/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error al cargar la oferta');
        const oferta = await res.json();
        document.getElementById("ofertaId").value = oferta.id;
        document.getElementById("ofertaTexto").value = oferta.texto;
        document.getElementById("ofertaIcono").value = oferta.icono || '';
        document.getElementById("ofertaModal").style.display = "block";
        document.getElementById("ofertaModalTitle").textContent = "Editar Oferta";
    } catch (error) {
        alert("Error al cargar la oferta para editar");
    }
};

window.deleteOferta = async function (id) {
    if (!confirm("¿Estás seguro de que deseas eliminar esta oferta?")) return;
    try {
        const token = localStorage.getItem("adminToken");
        const res = await fetch(`/ofertas/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error al eliminar la oferta');
        await loadAdminOfertas();
        alert("Oferta eliminada correctamente");
    } catch (error) {
        alert("Error al eliminar la oferta");
    }
};

// ================== ADMIN: FORMULARIO DE OFERTAS ==================
function setupOfertasAdmin() {
    const ofertaForm = document.getElementById("ofertaForm");
    if (!ofertaForm) return;
    ofertaForm.onsubmit = async function (e) {
        e.preventDefault();
        const token = localStorage.getItem("adminToken");
        const id = document.getElementById("ofertaId").value;
        const texto = document.getElementById("ofertaTexto").value;
        const icono = document.getElementById("ofertaIcono").value;
        try {
            const response = await fetch(id ? `/ofertas/${id}` : "/ofertas", {
                method: id ? "PUT" : "POST",
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `texto=${encodeURIComponent(texto)}&icono=${encodeURIComponent(icono)}`
            });
            if (response.ok) {
                alert(id ? "Oferta actualizada exitosamente" : "Oferta creada exitosamente");
                ofertaForm.reset();
                document.getElementById("ofertaModal").style.display = "none";
                await loadAdminOfertas();
            } else {
                throw new Error('Error al guardar la oferta');
            }
        } catch (error) {
            alert("Error al guardar la oferta");
        }
    };
}

// ================== ADMIN: EDITAR/ELIMINAR PRODUCTOS (SÓLO BOTONES) ==================
window.editProducto = async function (id) {
    try {
        cerrarTodosLosModales();
        imagenesAEliminar = []; // Reinicia la lista cada vez que editas
        const token = localStorage.getItem("adminToken");
        // Obtener datos del producto
        const res = await fetch(`/productos/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error al cargar el producto');
        const producto = await res.json();

        // Rellenar el formulario del modal
        document.getElementById("productModalTitle").textContent = "Editar Espejo";
        document.getElementById("productId").value = producto.id;
        document.getElementById("productName").value = producto.nombre || "";
        document.getElementById("productDesc").value = producto.descripcion || "";
        document.getElementById("productPriceWith").value = producto.precio_montura || "";
        document.getElementById("productPriceWithout").value = producto.precio_sin_montura || "";
        document.getElementById("productWidth").value = producto.ancho || "";
        document.getElementById("productHeight").value = producto.largo || "";
        document.getElementById("productCategory").value = producto.categoria || "";
        document.getElementById("productBadge").value = producto.badge || "";

        // Mostrar imágenes actuales
        const preview = document.getElementById("productImagesPreview");
        preview.innerHTML = '';
        
        if (producto.imagenes) {
            let imagenes = typeof producto.imagenes === 'string' ? 
                JSON.parse(producto.imagenes) : producto.imagenes;

            imagenes.forEach((img, index) => {
                preview.innerHTML += `
                    <div class="imagen-preview">
                        <img src="${corregirRutaImagen(img)}" 
                             alt="Imagen ${index + 1}"
                             onerror="this.src='/static/img/placeholder.jpg'">
                        <button type="button" 
                                onclick="eliminarImagen(${index})" 
                                class="btn-eliminar-imagen">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>`;
            });
        }

        // Mostrar modal
        const modal = document.getElementById("productModal");
        if (modal) {
            modal.style.display = "block";
            document.getElementById("productModalTitle").textContent = "Editar Espejo";
        }

    } catch (error) {
        console.error('Error:', error);
        alert(`Error al cargar el producto: ${error.message}`);
    }
};

// Guardar producto (nuevo o editado)
// Reemplaza el manejador del formulario de producto con este código:
function setupProductForm() {
    const productForm = document.getElementById("productForm");
    if (!productForm) {
        console.error("Formulario de producto no encontrado");
        return;
    }

    productForm.onsubmit = async function(e) {
        e.preventDefault();
        console.log("Enviando formulario de producto"); // Debug

        const token = localStorage.getItem("adminToken");
        const id = document.getElementById("productId").value;
        const formData = new FormData(this);

        // Adjunta imágenes a eliminar si hay
        if (imagenesAEliminar.length > 0) {
            formData.append("imagenes_eliminar", JSON.stringify(imagenesAEliminar));
        }

        try {
            console.log("Enviando petición al servidor"); // Debug
            const res = await fetch(id ? `/productos/${id}` : "/productos", {
                method: id ? "PUT" : "POST",
                headers: { 
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) {
                const error = await res.text();
                throw new Error(`Error del servidor: ${error}`);
            }

            await loadAdminProductos(); // Recargar la lista
            alert(id ? "Producto actualizado correctamente" : "Producto creado correctamente");
            
            // Limpiar formulario y cerrar modal
            this.reset();
            document.getElementById("productImagesPreview").innerHTML = "";
            imagenesAEliminar = [];
            const modal = document.getElementById("productModal");
            if (modal) {
                modal.style.display = "none";
                modal.classList.remove("activo");
            }
        } catch (error) {
            console.error("Error al guardar:", error);
            alert(`Error al guardar el producto: ${error.message}`);
        }
    };
}

// ================== ADMIN: BOTONES DEL PANEL ==================
function setupAdminPanelButtons() {
    console.log("Configurando botones del panel admin");
    setupAddOfertaButton();
    setupAddProductButton();
}

function setupAddOfertaButton() {
    const addOfertaBtn = document.getElementById("addOfertaBtn");
    if (!addOfertaBtn) {
        console.error("Botón addOfertaBtn no encontrado");
        return;
    }

    addOfertaBtn.onclick = function(e) {
        e.preventDefault();
        console.log("Click en agregar oferta");
        const modal = document.getElementById("ofertaModal");
        if (!modal) {
            console.error("Modal de oferta no encontrado");
            return;
        }

        // Limpiar el formulario antes de mostrarlo
        const form = document.getElementById("ofertaForm");
        if (form) form.reset();
        
        document.getElementById("ofertaId").value = "";
        document.getElementById("ofertaModalTitle").textContent = "Nueva Oferta";
        
        // Mostrar el modal
        modal.style.display = "block";
        modal.classList.add("activo");
    };
}

function setupAddProductButton() {
    const addProductBtn = document.getElementById("addProductBtn");
    if (!addProductBtn) {
        console.error("Botón addProductBtn no encontrado");
        return;
    }

    addProductBtn.onclick = function(e) {
        e.preventDefault();
        console.log("Click en agregar producto");
        const modal = document.getElementById("productModal");
        if (!modal) {
            console.error("Modal de producto no encontrado");
            return;
        }
        
        // Limpiar el formulario antes de mostrarlo
        const form = document.getElementById("productForm");
        if (form) form.reset();
        
        document.getElementById("productId").value = "";
        document.getElementById("productImagesPreview").innerHTML = "";
        document.getElementById("productModalTitle").textContent = "Nuevo Espejo";
        imagenesAEliminar = [];
        
        // Mostrar el modal
        modal.style.display = "block";
        modal.classList.add("activo");
    };
}

// Abrir modal login admin

async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem("adminToken");
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 429) {
            throw new Error('Demasiadas solicitudes. Por favor, espere un momento.');
        }

        if (!response.ok) {
            throw new Error('Error en la solicitud');
        }

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Agregar después de editProducto
// Reemplaza la función deleteProducto existente con esta versión:
window.deleteProducto = async function(id) {
    console.log("Intentando eliminar producto:", id); // Debug
    
    if (!confirm("¿Estás seguro de que deseas eliminar este producto?")) return;
    
    try {
        const token = localStorage.getItem("adminToken");
        if (!token) {
            throw new Error('No hay token de autenticación');
        }

        const res = await fetch(`/productos/${id}`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            const error = await res.text();
            throw new Error(`Error al eliminar: ${error}`);
        }

        await loadAdminProductos(); // Recargar la lista
        alert("Producto eliminado correctamente");
    } catch (error) {
        console.error("Error al eliminar:", error);
        alert(`Error al eliminar el producto: ${error.message}`);
    }
};

// Agrega esta función de utilidad
function handleImageError(img) {
    console.error(`Error cargando imagen: ${img.src}`);
    img.src = '/static/img/placeholder.jpg';
}

// ================== ADMIN: EDITAR PRODUCTO ==================
async function editarProducto(id) {
    try {
        const token = localStorage.getItem("adminToken");
        if (!token) {
            throw new Error('No hay token de autenticación');
        }

        console.log('Editando producto:', id); // Debug

        const res = await fetch(`/productos/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Error al cargar el producto');
        
        const producto = await res.json();
        console.log('Datos del producto recibidos:', producto); // Debug

        // Limpiar formulario primero
        document.getElementById("productForm").reset();

        // Rellenar todos los campos
        document.getElementById("productId").value = producto.id || '';
        document.getElementById("productName").value = producto.nombre || '';
        document.getElementById("productDesc").value = producto.descripcion || '';
        document.getElementById("productPriceWith").value = producto.precio_montura || '';
        document.getElementById("productPriceWithout").value = producto.precio_sin_montura || '';
        
        // Corregir campos que no se estaban cargando
        document.getElementById("productWidth").value = producto.ancho || '';
        document.getElementById("productHeight").value = producto.largo || '';
        document.getElementById("productCategory").value = producto.categoria || 'banos';
        document.getElementById("productBadge").value = producto.badge || '';

        console.log('Campos problemáticos:', {
            ancho: producto.ancho,
            largo: producto.largo,
            badge: producto.badge
        }); // Debug

        // Mostrar imágenes actuales
        const preview = document.getElementById("productImagesPreview");
        preview.innerHTML = '';
        
        if (producto.imagenes) {
            let imagenes = [];
            try {
                imagenes = typeof producto.imagenes === 'string' ? 
                    JSON.parse(producto.imagenes) : producto.imagenes;
                
                imagenes.forEach((img, index) => {
                    preview.innerHTML += `
                        <div class="imagen-preview">
                            <img src="${corregirRutaImagen(img)}" 
                                 alt="Imagen ${index + 1}"
                                 onerror="this.src='/static/img/placeholder.jpg'">
                            <button type="button" 
                                    onclick="eliminarImagen(${index})" 
                                    class="btn-eliminar-imagen">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>`;
                });
            } catch (e) {
                console.error('Error al procesar imágenes:', e);
            }
        }

        // Mostrar el modal
        const modal = document.getElementById("productModal");
        if (modal) {
            modal.style.display = "block";
            document.getElementById("productModalTitle").textContent = "Editar Espejo";
        }

    } catch (error) {
        console.error('Error al editar producto:', error);
        alert(`Error al cargar el producto: ${error.message}`);
    }
};

// ================== ADMIN: MANEJO DEL FORMULARIO DE PRODUCTO ==================
async function handleProductForm(e) {
    e.preventDefault();
    console.log('Manejando envío del formulario'); // Debug

    const token = localStorage.getItem("adminToken");
    if (!token) {
        alert('No hay token de autenticación');
        return;
    }

    const formData = new FormData(e.target);
    const productId = document.getElementById("productId").value;

    try {
        const url = productId ? `/productos/${productId}` : '/productos';
        const method = productId ? 'PUT' : 'POST';
        
        console.log(`Enviando ${method} a ${url}`); // Debug
        console.log('Datos del formulario:', Object.fromEntries(formData)); // Debug

        const res = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!res.ok) {
            const error = await res.text();
            throw new Error(error);
        }

        await loadAdminProductos(); // Recargar lista
        
        // Cerrar modal y limpiar formulario
        const modal = document.getElementById("productModal");
        if (modal) {
            modal.style.display = "none";
            e.target.reset();
            document.getElementById("productImagesPreview").innerHTML = '';
            imagenesAEliminar = [];
        }

        alert(productId ? "Producto actualizado" : "Producto agregado");

    } catch (error) {
        console.error('Error:', error);
        alert(`Error: ${error.message}`);
    }
}

function eliminarImagen(index) {
    const preview = document.getElementById("productImagesPreview");
    const imagenes = preview.querySelectorAll('.imagen-preview');
    if (imagenes[index]) {
        imagenes[index].remove();
    }
}
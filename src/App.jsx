import { useState, useEffect } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest, api } from "./authConfig";
import toast, { Toaster } from "react-hot-toast"; 
import './App.css'; 

export default function App() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [vista, setVista] = useState("dashboard");
  
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  
  const [nuevoProd, setNuevoProd] = useState({ nombre: "", precio: "", stock: "" });
  const [nuevoPed, setNuevoPed] = useState({ productoId: "", cantidad: "" });

  const user = accounts[0];
  const roles = user?.idTokenClaims?.roles || ["ROLE_CLIENTE"];
  
  const esAdmin = roles.includes("ROLE_ADMIN") || roles.includes("ADMIN");
  const esOperador = roles.includes("ROLE_OPERADOR") || roles.includes("OPERADOR");
  const esCliente = roles.includes("ROLE_CLIENTE") || roles.includes("CLIENTE");

  const handleLogin = () => instance.loginRedirect(loginRequest);
  const handleLogout = () => instance.logoutRedirect();

  const getBadgeClass = (estado) => {
    switch(estado) {
      case 'CREADO': return 'badge badge-creado';
      case 'ACEPTADO': return 'badge badge-aceptado';
      case 'EN_PREPARACION': return 'badge badge-preparacion';
      case 'DESPACHADO': return 'badge badge-despachado';
      case 'ENTREGADO': return 'badge badge-entregado';
      default: return 'badge badge-cancelado';
    }
  };

  const obtenerConfig = async () => {
    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: user
      });
      return {
        headers: { Authorization: `Bearer ${response.accessToken}` }
      };
    } catch (error) {
      console.error("Error al obtener token silencioso:", error);
      instance.loginRedirect(loginRequest);
      return {};
    }
  };

  const cargarDatos = async () => {
    try {
      const config = await obtenerConfig();
      const resCat = await api.get("/catalog", config);
      setProductos(resCat.data);
      
      const resOrd = await api.get("/orders", config);
      setPedidos(resOrd.data);
    } catch (err) {
      console.error("Error al consultar el BFF:", err);
      toast.error("Error al cargar la información del servidor");
    }
  };

  useEffect(() => {
    if (isAuthenticated) cargarDatos();
  }, [isAuthenticated, vista]); 

  const crearProducto = async (e) => {
    e.preventDefault();
    try {
      const config = await obtenerConfig();
      await api.post("/catalog", nuevoProd, config);
      setNuevoProd({ nombre: "", precio: "", stock: "" });
      toast.success("Producto agregado al catálogo");
      cargarDatos();
    } catch (error) {
      toast.error("No se pudo crear el producto");
    }
  };

  const crearPedido = async (e) => {
    e.preventDefault();
    try {
      const config = await obtenerConfig();
      await api.post("/orders", { 
        cliente: user.username, 
        productoId: Number(nuevoPed.productoId), 
        cantidad: Number(nuevoPed.cantidad) 
      }, config);
      setNuevoPed({ productoId: "", cantidad: "" });
      toast.success("Pedido manual registrado");
      cargarDatos();
    } catch (error) {
      toast.error("Error al registrar el pedido");
    }
  };

  const comprarDirecto = async (productoId) => {
    const config = await obtenerConfig();
    const loadingToast = toast.loading("Procesando compra..."); // <-- Estado de carga
    try {
      await api.post("/orders", { 
        cliente: user.username, 
        productoId: Number(productoId), 
        cantidad: 1 
      }, config);
      toast.success("Pedido registrado exitosamente 🚀", { id: loadingToast });
      cargarDatos();
    } catch (error) {
      toast.error("Error al procesar la compra", { id: loadingToast });
    }
  };

  const cambiarEstado = async (id, estado) => {
    try {
      const config = await obtenerConfig();
      await api.put(`/orders/${id}/estado?nuevoEstado=${estado}`, null, config);
      toast.success(`Estado actualizado a: ${estado}`);
      cargarDatos();
    } catch (error) {
      toast.error(error.response?.data || "Error al cambiar estado (Regla de negocio)");
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ padding: "40px", textAlign: "center", marginTop: "10vh" }}>
        <h1 style={{ color: "#1e3a8a", fontSize: "36px" }}>Pedidos360</h1>
        <p>Inicia sesión con tu cuenta de Microsoft Entra ID para acceder.</p>
        <button 
          onClick={handleLogin} 
          style={{ padding: "12px 24px", fontSize: "16px", cursor: "pointer", background: "#1e3a8a", color: "white", border: "none", borderRadius: "4px", marginTop: "20px" }}
        >
          Iniciar Sesión
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Inicializador de Toasts en la app */}
      <Toaster position="bottom-right" reverseOrder={false} />

      {/* BARRA SUPERIOR AZUL */}
      <header className="header">
        <h1 className="header-logo" onClick={() => setVista("dashboard")}>Pedidos360</h1>
        
        <input 
          type="text" 
          className="header-search" 
          placeholder="Buscar productos, marcas y más..." 
        />
        
        <nav className="header-nav">
          <button onClick={() => setVista("dashboard")}>Inicio</button>
          <button onClick={() => setVista("orders")}>Mis Pedidos</button>
          {(esAdmin || esOperador) && (
            <button onClick={() => setVista("catalog")}>Panel Admin</button>
          )}
          <span style={{ marginLeft: "20px", color: "white", fontSize: "14px", borderLeft: "1px solid rgba(255,255,255,0.3)", paddingLeft: "20px" }}>
            {user.name || user.username}
          </span>
          <button onClick={handleLogout}>Salir</button>
        </nav>
      </header>

      <main className="main-container">
        
        {/* VISTA CLIENTE: GRILLA ESTILO MERCADO LIBRE */}
        {vista === "dashboard" && (
          <div>
            {(esAdmin || esOperador) && (
              <p style={{ color: "#666", marginBottom: "20px" }}>
                Panel de {roles.join(", ")} | Total Pedidos Registrados: <b>{pedidos.length}</b>
              </p>
            )}
            
            <div className="product-grid">
              {productos.map(prod => (
                <div className="product-card" key={prod.id}>
                  {/* <-- Imagen dinámica inyectada aquí --> */}
                  <img 
                    src={`https://picsum.photos/seed/${prod.id + 100}/300/200`} 
                    alt={prod.nombre} 
                    className="product-image"
                  />
                  <span className="product-price">${prod.precio?.toLocaleString('es-CL')}</span>
                  <span style={{ color: "#00a650", fontSize: "13px", fontWeight: "600", marginBottom: "5px" }}>Llega gratis mañana</span>
                  <h2 className="product-title">{prod.nombre}</h2>
                  <p style={{ fontSize: "12px", color: "#999", margin: "0 0 15px 0" }}>Stock: {prod.stock}</p>
                  <button className="btn-comprar" onClick={() => comprarDirecto(prod.id)}>Comprar</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VISTA PEDIDOS (FORMULARIO Y TABLA ADMIN/OPERADOR) */}
        {vista === "orders" && (
          <div className="admin-section">
            <h2>Gestión de Pedidos</h2>
            
            <form onSubmit={crearPedido} className="form-group">
              <input placeholder="ID Producto" value={nuevoPed.productoId} onChange={e => setNuevoPed({...nuevoPed, productoId: e.target.value})} required />
              <input placeholder="Cantidad" type="number" value={nuevoPed.cantidad} onChange={e => setNuevoPed({...nuevoPed, cantidad: e.target.value})} required />
              <button type="submit">Solicitar Manualmente</button>
            </form>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th><th>Cliente</th><th>Producto ID</th><th>Cant.</th><th>Estado</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pedidos
                  .filter(p => esAdmin || esOperador || p.cliente === user.username)
                  .map(p => (
                  <tr key={p.id}>
                    <td>{p.id}</td><td>{p.cliente}</td><td>{p.productoId}</td><td>{p.cantidad}</td>
                    {/* <-- Badge dinámico de estado inyectado aquí --> */}
                    <td>
                      <span className={getBadgeClass(p.estado)}>
                        {p.estado}
                      </span>
                    </td>
                    <td>
                      {(esAdmin || esOperador) ? (
                        <div style={{ display: "flex", gap: "5px" }}>
                          <button onClick={() => cambiarEstado(p.id, "ACEPTADO")} style={{ fontSize: "12px", padding: "8px 12px", cursor: "pointer", border: "1px solid #ccc", background: "#f9f9f9", borderRadius: "4px" }}>Aceptar</button>
                          <button onClick={() => cambiarEstado(p.id, "EN_PREPARACION")} style={{ fontSize: "12px", padding: "8px 12px", cursor: "pointer", border: "1px solid #ccc", background: "#f9f9f9", borderRadius: "4px" }}>Preparar</button>
                          <button onClick={() => cambiarEstado(p.id, "DESPACHADO")} style={{ fontSize: "12px", padding: "8px 12px", cursor: "pointer", border: "1px solid #ccc", background: "#f9f9f9", borderRadius: "4px" }}>Despachar</button>
                        </div>
                      ) : <span style={{ color: "#999", fontSize: "13px" }}>Solo lectura</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* VISTA CATÁLOGO ADMIN */}
        {vista === "catalog" && (esAdmin || esOperador) && (
          <div className="admin-section">
            <h2>Control de Catálogo y Stock</h2>
            
            <form onSubmit={crearProducto} className="form-group">
              <input placeholder="Nombre" value={nuevoProd.nombre} onChange={e => setNuevoProd({...nuevoProd, nombre: e.target.value})} required />
              <input placeholder="Precio" type="number" value={nuevoProd.precio} onChange={e => setNuevoProd({...nuevoProd, precio: e.target.value})} required />
              <input placeholder="Stock Inicial" type="number" value={nuevoProd.stock} onChange={e => setNuevoProd({...nuevoProd, stock: e.target.value})} required />
              <button type="submit">Guardar Producto</button>
            </form>

            <table className="admin-table">
              <thead>
                <tr><th>ID</th><th>Nombre</th><th>Precio</th><th>Stock Disponible</th></tr>
              </thead>
              <tbody>
                {productos.map(prod => (
                  <tr key={prod.id}>
                    <td>{prod.id}</td><td>{prod.nombre}</td><td>${prod.precio?.toLocaleString('es-CL')}</td><td><b>{prod.stock}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>
    </div>
  );
}
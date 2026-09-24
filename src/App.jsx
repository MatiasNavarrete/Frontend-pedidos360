import { useState, useEffect } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest, api } from "./authConfig";

export default function App() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [vista, setVista] = useState("dashboard");
  
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  
  const [nuevoProd, setNuevoProd] = useState({ nombre: "", precio: "", stock: "" });
  const [nuevoPed, setNuevoPed] = useState({ productoId: "", cantidad: "" });

  const user = accounts[0];
  const roles = user?.idTokenClaims?.roles || ["ROLE_CLIENTE"]; // Por defecto Cliente si no tiene rol asignado aún
  
  const esAdmin = roles.includes("ROLE_ADMIN") || roles.includes("ADMIN");
  const esOperador = roles.includes("ROLE_OPERADOR") || roles.includes("OPERADOR");
  const esCliente = roles.includes("ROLE_CLIENTE") || roles.includes("CLIENTE");

  const handleLogin = () => instance.loginRedirect(loginRequest);
  const handleLogout = () => instance.logoutRedirect();

  const cargarDatos = async () => {
    try {
      const resCat = await api.get("/catalog");
      setProductos(resCat.data);
      const resOrd = await api.get("/orders");
      setPedidos(resOrd.data);
    } catch (err) {
      console.error("Error al consultar el BFF:", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) cargarDatos();
  }, [isAuthenticated, vista]);

  if (!isAuthenticated) {
    return (
      <div style={{ padding: "40px", fontFamily: "sans-serif", textAlign: "center" }}>
        <h1>📦 Sistema Pedidos360</h1>
        <p>Inicia sesión con tu cuenta de Microsoft Entra ID para acceder.</p>
        <button onClick={handleLogin} style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer" }}>
          Iniciar Sesión (MSAL)
        </button>
      </div>
    );
  }

  const crearProducto = async (e) => {
    e.preventDefault();
    await api.post("/catalog", nuevoProd);
    setNuevoProd({ nombre: "", precio: "", stock: "" });
    cargarDatos();
  };

  const crearPedido = async (e) => {
    e.preventDefault();
    await api.post("/orders", { 
      cliente: user.username, 
      productoId: Number(nuevoPed.productoId), 
      cantidad: Number(nuevoPed.cantidad) 
    });
    setNuevoPed({ productoId: "", cantidad: "" });
    cargarDatos();
  };

  const cambiarEstado = async (id, estado) => {
    try {
      await api.put(`/orders/${id}/estado?nuevoEstado=${estado}`);
      cargarDatos();
    } catch (error) {
      alert(error.response?.data || "Error al cambiar estado (Regla de negocio)");
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      {/* Barra de Navegación Protegida */}
      <nav style={{ display: "flex", gap: "15px", borderBottom: "2px solid #ccc", paddingBottom: "10px", marginBottom: "20px" }}>
        <strong>Pedidos360</strong>
        <button onClick={() => setVista("dashboard")}>/dashboard</button>
        <button onClick={() => setVista("orders")}>/orders</button>
        {(esAdmin || esOperador) && (
          <button onClick={() => setVista("catalog")}>/catalog (Solo Admin/Operador)</button>
        )}
        <span style={{ marginLeft: "auto" }}>
          👤 {user.name || user.username} | 🏷️ Roles: <b>{roles.join(", ")}</b>
        </span>
        <button onClick={handleLogout}>Cerrar Sesión</button>
      </nav>

      {/* 2. Pantalla /dashboard */}
      {vista === "dashboard" && (
        <div>
          <h2>📊 Dashboard (Resumen por Rol)</h2>
          {esAdmin && <p>🔹 <b>Vista Administrador:</b> Tienes control global del catálogo, stock y todos los pedidos.</p>}
          {esOperador && <p>🔸 <b>Vista Operador:</b> Puedes gestionar la cola de pedidos, cambiar estados y controlar stock.</p>}
          {esCliente && <p>🟢 <b>Vista Cliente:</b> Puedes explorar el catálogo disponible y crear/seguir tus pedidos.</p>}
          <p>Total Productos en Catálogo: <b>{productos.length}</b> | Total Pedidos Registrados: <b>{pedidos.length}</b></p>
        </div>
      )}

      {/* 3. Pantalla /orders */}
      {vista === "orders" && (
        <div>
          <h2>🛒 Gestión de Pedidos (/orders)</h2>
          <form onSubmit={crearPedido} style={{ marginBottom: "20px", padding: "10px", border: "1px solid #ddd" }}>
            <h4>Crear Nuevo Pedido</h4>
            <input placeholder="ID Producto" value={nuevoPed.productoId} onChange={e => setNuevoPed({...nuevoPed, productoId: e.target.value})} required />
            <input placeholder="Cantidad" type="number" value={nuevoPed.cantidad} onChange={e => setNuevoPed({...nuevoPed, cantidad: e.target.value})} required />
            <button type="submit">Solicitar Pedido</button>
          </form>

          <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>ID</th><th>Cliente</th><th>Producto ID</th><th>Cantidad</th><th>Estado Actual</th><th>Acciones (Operador/Admin)</th>
              </tr>
            </thead>
            <tbody>
              {pedidos
                .filter(p => esAdmin || esOperador || p.cliente === user.username)
                .map(p => (
                <tr key={p.id}>
                  <td>{p.id}</td><td>{p.cliente}</td><td>{p.productoId}</td><td>{p.cantidad}</td>
                  <td><b>{p.estado}</b></td>
                  <td>
                    {(esAdmin || esOperador) ? (
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button onClick={() => cambiarEstado(p.id, "ACEPTADO")}>1. Aceptar (Baja Stock)</button>
                        <button onClick={() => cambiarEstado(p.id, "EN_PREPARACION")}>2. Preparar</button>
                        <button onClick={() => cambiarEstado(p.id, "DESPACHADO")}>3. Despachar</button>
                        <button onClick={() => cambiarEstado(p.id, "ENTREGADO")}>4. Entregar</button>
                      </div>
                    ) : <span>Solo lectura</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Pantalla /catalog (Guard de rol) */}
      {vista === "catalog" && (esAdmin || esOperador) && (
        <div>
          <h2>📦 Control de Catálogo y Stock (/catalog)</h2>
          <form onSubmit={crearProducto} style={{ marginBottom: "20px", padding: "10px", border: "1px solid #ddd" }}>
            <h4>Agregar Producto</h4>
            <input placeholder="Nombre" value={nuevoProd.nombre} onChange={e => setNuevoProd({...nuevoProd, nombre: e.target.value})} required />
            <input placeholder="Precio" type="number" value={nuevoProd.precio} onChange={e => setNuevoProd({...nuevoProd, precio: e.target.value})} required />
            <input placeholder="Stock Inicial" type="number" value={nuevoProd.stock} onChange={e => setNuevoProd({...nuevoProd, stock: e.target.value})} required />
            <button type="submit">Guardar Producto</button>
          </form>

          <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr><th>ID</th><th>Nombre</th><th>Precio</th><th>Stock Disponible</th></tr>
            </thead>
            <tbody>
              {productos.map(prod => (
                <tr key={prod.id}>
                  <td>{prod.id}</td><td>{prod.nombre}</td><td>${prod.precio}</td><td><b>{prod.stock}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
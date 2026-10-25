# Pedidos360 - Nombre del Microservicio: Frontend 

## 📋 Descripción
Microservicio integrante de la arquitectura orientada a servicios de **Pedidos360**. Su función principal es [indicar brevemente si gestiona la interfaz/BFF, el catálogo de productos, la creación de pedidos o la administración de infraestructura] para cumplir con los requerimientos de la evaluación EP3.

## 🛠️ Tecnologías y Versiones
* **Lenguaje:** Java 21 (SDK 27)
* **Framework:** Spring Boot (v4.1.1)
* **Mensajería Cloud:** Azure Service Bus (`azure-messaging-servicebus:7.17.4`)
* **Base de Datos:** MySQL / Spring Data JPA (si aplica)
* **Gestor de Dependencias:** Maven

## ⚙️ Configuración (`application.yml`)
Para que el microservicio pueda comunicarse con la infraestructura en la nube, asegúrate de tener configuradas las siguientes propiedades en tu archivo `src/main/resources/application.yml`:

```yaml
spring:
  cloud:
    azure:
      servicebus:
        connection-string: "Endpoint=sb://sb-pedidos360-admin.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=TU_LLAVE_DE_ACCESO"

app:
      mensajeria:
        cola-pedidos: "cola-pedidos"

👥 Autores y Roles en el Proyecto
Infraestructura y Admin: Thomas Ceron

Productores y Conexión Azure: Matias Navarrete

Consumidores Asíncronos (Listener/DLQ): Jose Romero

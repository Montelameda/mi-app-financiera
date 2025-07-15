// Indica que este componente se ejecuta en el lado del cliente (en el navegador)
"use client";

// Importamos las herramientas de React que necesitamos
import { useState, useEffect } from 'react';

// Este es el componente principal de tu página de inicio
export default function HomePage() {

  // --- ESTADO DEL COMPONENTE ---
  // 1. Guardamos la fecha y hora actual. Se inicializa en null.
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);
  
  // 2. Guardamos el color actual del botón. Empieza en azul.
  const [buttonColor, setButtonColor] = useState<'#3b82f6' | '#ef4444'>('#3b82f6'); // Azul o Rojo

  // --- EFECTOS ---
  // Este bloque de código se ejecuta una sola vez cuando el componente carga
  useEffect(() => {
    // Creamos un intervalo que actualiza la fecha y hora cada segundo
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    // Función de limpieza: se ejecuta cuando el componente se "desmonta"
    // para evitar que el reloj siga corriendo innecesariamente.
    return () => clearInterval(timer);
  }, []); // El array vacío [] asegura que solo se ejecute una vez.

  // --- FUNCIONES DE EVENTOS ---
  // Esta función se llama cuando se hace clic en el botón
  const handleButtonClick = () => {
    // Cambiamos el color del botón al color opuesto
    setButtonColor(prevColor => prevColor === '#3b82f6' ? '#ef4444' : '#3b82f6');
  };

  // --- RENDERIZADO (LO QUE SE VE EN PANTALLA) ---
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#111827', // Un fondo oscuro
      color: 'white',
      fontFamily: 'sans-serif',
      textAlign: 'center',
      padding: '2rem'
    }}>
      
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        ¡Bienvenido a tu App Financiera!
      </h1>
      
      <p style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>
        Esta es tu nueva página de inicio interactiva.
      </p>

      <div style={{
        backgroundColor: '#1f2937',
        padding: '2rem',
        borderRadius: '10px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)'
      }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Fecha y Hora Actual (Chile)</h2>
        {currentDateTime ? (
          <p style={{ fontSize: '2rem', fontFamily: 'monospace', color: '#60a5fa' }}>
            {currentDateTime.toLocaleTimeString('es-CL')}
          </p>
        ) : (
          <p>Cargando reloj...</p>
        )}
      </div>

      <button 
        onClick={handleButtonClick}
        style={{
          marginTop: '2rem',
          padding: '1rem 2rem',
          fontSize: '1rem',
          color: 'white',
          backgroundColor: buttonColor,
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'background-color 0.3s ease' // Transición suave de color
        }}
      >
        ¡Haz clic para cambiar mi color!
      </button>

    </main>
  );
}
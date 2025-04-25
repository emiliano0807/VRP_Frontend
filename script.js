const ubicaciones = {
  'EDO.MEX': [19.293704, -99.653710],
  'QRO': [20.593507, -100.390072],
  'CDMX': [19.432915, -99.133364],
  'SLP': [22.150933, -100.974140],
  'MTY': [25.675058, -100.287582],
  'PUE': [19.063633, -98.306990],
  'GDL': [20.677204, -103.346994],
  'MICH': [19.702594, -101.192382],
  'SON': [29.075226, -110.959624]
};

let restriccionCount = 0;

document.getElementById('agregarRestriccion').addEventListener('click', () => {
  if (restriccionCount >= 10) {
    Swal.fire("Límite alcanzado", "Máximo 10 restricciones.", "warning");
    return;
  }

  const contenedor = document.getElementById('restriccionesContainer');
  const div = document.createElement('div');
  div.className = 'restriccion';
  div.innerHTML = `
    <input placeholder="Origen (ej: QRO)" class="origen" required />
    <input placeholder="Destino (ej: PUE)" class="destino" required />
    <button type="button" class="borrarRestriccion">❌</button>
  `;
  contenedor.appendChild(div);
  restriccionCount++;

  div.querySelector('.borrarRestriccion').addEventListener('click', () => {
    div.remove();
    restriccionCount--;
  });
});

document.getElementById('vrpForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const almacenKey = document.getElementById('almacen').value;
  const max_carga = parseInt(document.getElementById('max_carga').value);
  const contenedor = document.getElementById('resultados');

  if (!almacenKey || !max_carga) {
    Swal.fire("Campos vacíos", "Completa todos los campos.", "warning");
    return;
  }

  const almacenCoords = ubicaciones[almacenKey];
  const restricciones = [];
  let error = false;

  document.querySelectorAll('.restriccion').forEach(div => {
    const origen = div.querySelector('.origen').value.trim().toUpperCase();
    const destino = div.querySelector('.destino').value.trim().toUpperCase();

    if (!origen || !destino) {
      Swal.fire("Error", "Cada restricción debe tener origen y destino.", "error");
      error = true;
      return;
    }

    if (!(origen in ubicaciones) || !(destino in ubicaciones)) {
      Swal.fire("Error", `Ubicación inválida: ${origen} o ${destino}`, "error");
      error = true;
    } else {
      restricciones.push([origen, destino]);
    }
  });

  if (error) return;

  const datos = {
    almacen: almacenCoords,
    max_carga,
    restricciones_trafico: restricciones
  };

  contenedor.innerHTML = "⌛ Procesando rutas...";
  try {
    const res = await fetch('http://localhost:8000/vrp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });

    const resultado = await res.json();
    console.log(resultado);

    // Verificamos que 'resultado.rutas' esté presente y sea un array
    if (Array.isArray(resultado.rutas) && resultado.rutas.length > 0) {
      mostrarResultados(resultado.rutas);
    } else {
      Swal.fire("No se encontraron rutas", "La API no devolvió rutas válidas.", "info");
    }
  } catch (err) {
    Swal.fire("Error de conexión", err.message, "error");
  }
});

function mostrarResultados(rutas) {
  const contenedor = document.getElementById('resultados');
  contenedor.innerHTML = `<h2>🚚 Rutas Generadas: ${rutas.length}</h2>`;

  if (!rutas.length) {
    contenedor.innerHTML += '<p>No se generaron rutas.</p>';
    return;
  }

  // Inicializar el mapa con las rutas
  inicializarMapa(rutas); // Ahora pasamos las rutas como argumento

  rutas.forEach((ruta, i) => {
    contenedor.innerHTML += `
      <div class="ruta">
        <h3>Ruta ${i + 1}</h3>
        <p><strong>Clientes:</strong> ${ruta.ruta.join(' → ')}</p>
        <p><strong>Peso total:</strong> ${ruta.peso_total} kg</p>
        <p><strong>Costo estimado:</strong> $${ruta.costo.toFixed(2)}</p>
        <p><strong>Tiempo estimado:</strong> ${ruta.tiempo}</p>
      </div>
    `;
    console.log(`Ruta: ${ruta.ruta}, Costo: ${ruta.costo}, Tiempo: ${ruta.tiempo}`);
  });
}

let mapa;

function inicializarMapa(rutas) {
  // Verifica si el mapa ya fue inicializado
  if (mapa) {
    mapa.remove(); // Elimina el mapa existente
  }

  mapa = L.map('mapa').setView([22.0, -102.0], 5); // Reinicializa
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapa);

  // Asegúrate de que las ubicaciones y rutas estén definidas correctamente
  rutas.forEach(ruta => {
    dibujarRutaEnMapa(ruta); // Llamamos a la función para dibujar cada ruta
  });
}

// Función para dibujar la ruta en el mapa
function dibujarRutaEnMapa(ruta) {
  const puntos = ruta.ruta.map(ciudad => ubicaciones[ciudad]); // Convierte las ciudades a coordenadas
  const polyline = L.polyline(puntos, {
    color: '#FF5733', // Color de la ruta, puedes cambiarlo
    weight: 5,        // Grosor de la línea
    opacity: 0.7      // Opacidad de la línea
  }).addTo(mapa);

  // Añadir marcadores en cada ciudad de la ruta
  ruta.ruta.forEach(ciudad => {
    const [lat, lng] = ubicaciones[ciudad];
    L.marker([lat, lng]).addTo(mapa).bindPopup(`<strong>${ciudad}</strong>`);
  });

  // Ajustar el mapa para mostrar toda la ruta
  mapa.fitBounds(polyline.getBounds());
}

function Contenedor({
  contenedor,
  onAbrirReferencias,
}) {

  const porcentajePeso = Math.min(
    (contenedor.peso / 25) * 100,
    100
  );

  const porcentajeCbm = Math.min(
    (contenedor.cbm / 71) * 100,
    100
  );


  return (

    <div className="bg-gray-50 border rounded-xl p-5 shadow-sm">

      {/* =================================================
          SEMANA
      ================================================= */}

      <div className="flex justify-between items-center">

        <h3 className="text-lg font-bold">

          Semana {contenedor.semana}

        </h3>

        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">

          Plan

        </span>

      </div>


      {/* =================================================
          CONTENEDOR
      ================================================= */}

      <div className="mt-4 bg-white border rounded-lg p-4">

        <p className="font-semibold text-lg">

          {contenedor.nombre}

        </p>


        {/* =================================================
            PESO
        ================================================= */}

        <div className="mt-4">

          <div className="flex justify-between text-sm">

            <span>
              Peso
            </span>

            <span className="font-semibold">

              {contenedor.peso.toFixed(2)} / 25 Ton

            </span>

          </div>


          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">

            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{
                width: `${porcentajePeso}%`,
              }}
            />

          </div>

        </div>


        {/* =================================================
            CBM
        ================================================= */}

        <div className="mt-4">

          <div className="flex justify-between text-sm">

            <span>
              CBM
            </span>

            <span className="font-semibold">

              {contenedor.cbm.toFixed(2)} / 71 m³

            </span>

          </div>


          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">

            <div
              className="bg-green-600 h-2 rounded-full"
              style={{
                width: `${porcentajeCbm}%`,
              }}
            />

          </div>

        </div>


        {/* =================================================
            BOTÓN AGREGAR REFERENCIAS
        ================================================= */}

        <button
          onClick={() =>
            onAbrirReferencias(contenedor.id)
          }
          className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
        >

          + Agregar referencias

        </button>


        {/* =================================================
            REFERENCIAS ASIGNADAS
        ================================================= */}

        <div className="mt-5">

          <p className="text-sm font-semibold">

            Referencias asignadas

          </p>


          {contenedor.referencias.length === 0 ? (

            <p className="text-sm text-gray-400 mt-2">

              Sin referencias asignadas.

            </p>

          ) : (

            <div className="mt-2 space-y-2">

              {contenedor.referencias.map(
                (ref, index) => (

                  <div
                    key={
                      ref.referenceID ||
                      index
                    }
                    className="bg-gray-50 border rounded-lg p-3"
                  >

                    <div className="flex justify-between">

                      <div>

                        <p className="font-semibold text-blue-700">

                          {ref.referencia}

                        </p>

                        <p className="text-xs text-gray-500">

                          {ref.descripcion}

                        </p>

                      </div>


                      <div className="text-right">

                        <p className="font-bold">

                          {ref.cantidad}

                        </p>

                        <p className="text-xs text-gray-500">

                          cajas

                        </p>

                      </div>

                    </div>


                    <div className="grid grid-cols-2 gap-3 mt-2 text-xs text-gray-500">

                      <div>

                        Peso:

                        <span className="font-semibold text-gray-700">

                          {" "}
                          {ref.pesoTotal.toFixed(2)} kg

                        </span>

                      </div>


                      <div>

                        CBM:

                        <span className="font-semibold text-gray-700">

                          {" "}
                          {ref.cbmTotal.toFixed(2)}

                        </span>

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>

      </div>

    </div>

  );

}

export default Contenedor;
import React, { useState, useEffect, useCallback } from 'react';
import { useReadCypher } from 'use-neo4j';
import 'bootstrap/dist/css/bootstrap.min.css';
const traducirRelacion = (relacion: string) => {
  switch (relacion) {
    case 'ACTED_IN':
      return 'Actor/Actriz';
    case 'DIRECTED':
      return 'Diregido/a';
    case 'PRODUCED':
      return 'Producido/a';
    case 'WROTE':
      return 'Escritor';
    case 'FOLLOWS':
      return 'Seguimientos';
    case 'REVIEWED':
      return 'Revisiones';
    case '':
      return '';
    default:
      return 'Desconocido';
  }
}
const reTraduccion = (relacion: string) => {
  switch (relacion) {
    case 'Actor/Actriz':
      return 'ACTED_IN';
    case 'Diregido/a':
      return 'DIRECTED';
    case 'Producido/a':
      return 'PRODUCED';
    case 'Escritor':
      return 'WROTE';
    case 'Seguimientos':
      return 'FOLLOWS';
    case 'Revisiones':
      return 'REVIEWED';
    case '':
      return '';
    default:
      return 'UNKNOWN';
  }
}
const App = () => {
  const [rows, setRows] = useState<any>([]);
  const [personSelected, setPersonSelected] = useState<string>('');
  const [movieSelected, setMovieSelected] = useState<string>('');
  const [relationshipSelected, setRelationshipSelected] = useState<string>('');
  const [yearSelected, setYearSelected] = useState<string>('');
  const [orderPersonSelected, setOrderPersonSelected] = useState<string>('');
  const [orderMovieSelected, setOrderMovieSelected] = useState<string>('');
  const [queryShow, setQueryShow] = useState<string>(`
MATCH (p:Person)-[d]->(m:Movie)
RETURN p, d, m`
  );

  const { loading, result: queryresult, run, error } = useReadCypher(`
MATCH (p:Person)-[d]->(m:Movie)
  WHERE (COALESCE($relationshipSelected, '') = '' OR TYPE(d) = $relationshipSelected) AND
        (COALESCE($personSelected, '') = '' OR p.name = $personSelected) AND
        (COALESCE($movieSelected, '') = '' OR m.title = $movieSelected) AND
        (COALESCE($yearSelected, '') = '' OR m.released > $yearSelected)
  RETURN p, d, m
  ORDER BY CASE WHEN COALESCE($orderPersonSelected, '') = 'ASC' THEN p.name END ASC,
           CASE WHEN COALESCE($orderPersonSelected, '') = 'DESC' THEN p.name END DESC,
           CASE WHEN COALESCE($orderMovieSelected, '') = 'ASC' THEN m.title END ASC,
           CASE WHEN COALESCE($orderMovieSelected, '') = 'DESC' THEN m.title END DESC
`, {
    personSelected, movieSelected, relationshipSelected: reTraduccion(relationshipSelected),
    orderPersonSelected, orderMovieSelected,
    yearSelected: !!yearSelected ? parseInt(yearSelected) : null
  });

  const [moviesList, setMoviesList] = useState<any>([]);
  const [personsList, setPersonsList] = useState<any>([]);
  const [relationshipsList, setRelationshipsList] = useState<any>([]);
  const [yearsList, setYearsList] = useState<any>([]);

  const { loading: loadingPersons, result: resultPersons, error: errorPersons, run: runPersons } = useReadCypher(
    `MATCH (p:Person)-[d]->(m:Movie)
    WHERE(COALESCE($movieSelected, '') = '' OR m.title = $movieSelected)
    RETURN DISTINCT p
    ORDER BY p.name ASC`,
    { movieSelected }
  );

  const { loading: loadingMovies, result: resultMovies, error: errorMovies, run: runMovies } = useReadCypher(
    `MATCH (p:Person)-[d]->(m:Movie)
    WHERE (COALESCE($personSelected, '') = '' OR p.name = $personSelected)
    RETURN DISTINCT m
    ORDER BY m.title ASC`,
    { personSelected }
  );

  const { loading: loadingRelationships, result: resultRelationships, error: errorRelationships } = useReadCypher(
    `MATCH ()-[r]->() RETURN COLLECT(DISTINCT TYPE(r)) AS tipos`
  );

  // const { loading, result: queryresult, error } = useReadCypher(query, {});

  // Memorizo `processInfo` para evitar renders infinitos
  const processInfo = useCallback((record: any) => {
    const person = record.get('p'); // Nodo `p` (Person)
    const relationship = record.get('d'); // Relación `d` (DIRECTED)
    const movie = record.get('m'); // Nodo `m` (Movie)

    return {
      Person: person?.properties?.name || 'Unknown',
      Relationship: traducirRelacion(relationship?.type) || 'Unknown',
      Movie: movie?.properties?.title || 'Unknown',
      Tagline: movie?.properties?.tagline || 'N/A',
      Released: movie?.properties?.released?.low || 'N/A',
    };
  }, []);

  const onClickReset = () => {
    setPersonSelected('');
    setMovieSelected('');
    setRelationshipSelected('');
    setYearSelected('');
    setOrderMovieSelected('');
    setOrderPersonSelected('');
  }
  const processQueryToShow = () => {
    console.log("order", orderPersonSelected === '' || orderMovieSelected === '');

    const initialQuery = `
MATCH (p:Person)-[d]->(m:Movie)${relationshipSelected
        ? "\nWHERE TYPE(d) = '" + relationshipSelected + "'" + (personSelected || movieSelected || yearSelected ? ' AND ' : '')
        : !personSelected && !movieSelected && !yearSelected ? '' : '\nWHERE '
      }${personSelected
        ? "p.name = '" + personSelected +"'"+ (movieSelected || yearSelected ? " AND " : '')
        : ''}${movieSelected
          ? "m.title = '" + movieSelected + "'" + (yearSelected ? " AND " : '')
          : ''}${yearSelected
            ? "m.releated > " + yearSelected
            : ''}
RETURN p, d, m
${orderPersonSelected !== '' || orderMovieSelected !== ''
        ? 'ORDER BY '
        : ''}${orderPersonSelected !== '' ? orderPersonSelected === 'ASC'
          ? "p.name ASC" + (orderMovieSelected ?', ' : '')
          : "p.name DESC" + (orderMovieSelected ?', ' : '')
          : ''}${orderMovieSelected !== '' ? orderMovieSelected === 'ASC'
            ? "m.title ASC"
            : "m.title DESC"
            : ''}
    `
    return initialQuery
  }
  // Ejecuto `processInfo` cuando los datos estén disponibles
  useEffect(() => {
    console.log("calculado", queryresult);
    console.log("result", queryresult?.records);
    if (!loading && queryresult) {
      const processed = queryresult.records.map((record: any) => processInfo(record));
      setRows(processed);
    }
    if (error) console.error('Error ejecutando la consulta:', error);
  }, [loading, queryresult, processInfo, error]);


  useEffect(() => {
    if (!loadingPersons && resultPersons) {
      const processed = resultPersons.records.map((record: any) => record.get('p').properties.name);
      setPersonsList(processed);
    }
    if (errorPersons) console.error('Error ejecutando la consulta:', errorPersons);
  }, [loadingPersons, resultPersons])

  useEffect(() => {
    if (!loadingMovies && resultMovies) {
      const processed = resultMovies.records.map((record: any) => record.get('m').properties.title);
      setMoviesList(processed);
    }
  }, [loadingMovies, resultMovies])

  useEffect(() => {
    if (!loadingRelationships && resultRelationships) {
      const processed = resultRelationships.records[0].get('tipos');
      const relationsTraducidas = processed.map((item: any) => {
        return traducirRelacion(item);
      })
      setRelationshipsList(relationsTraducidas);
    }
  }, [loadingRelationships, resultRelationships])

  useEffect(() => {
    console.log("seleccionado un campo entonces run", personSelected, movieSelected, relationshipSelected, yearSelected, orderPersonSelected, orderMovieSelected);
    run({
      personSelected, movieSelected, relationshipSelected: reTraduccion(relationshipSelected),
      orderMovieSelected, orderPersonSelected, yearSelected: !!yearSelected ? parseInt(yearSelected) : null
    });
    const query = processQueryToShow();
    setQueryShow(query);
  }, [personSelected, movieSelected, relationshipSelected, yearSelected, orderPersonSelected, orderMovieSelected]);

  useEffect(() => {
    runMovies({ personSelected });
    // if(movieSelected !== '') setMovieSelected('');
    // setMovieSelected('');
  }, [personSelected]);

  useEffect(() => {
    runPersons({ movieSelected });
    // if(personSelected !== '') setPersonSelected('');
    // setPersonSelected('');
  }, [movieSelected]);

  useEffect(() => {
    function getYears() {
      const years = [];
      for (let i = 2024; i >= 1980; i--) {
        years.push(i);
      }
      return years;
    }
    setYearsList(getYears());
  }, []);

  return (
    <div>

      <div className='d-flex flex-column align-items-center m-3'>
        <h2 className="mb-2">Integración React con Neo4j</h2>
        <div className="d-flex justify-content-around w-100 mt-4">
          <div className="d-flex flex-column align-items-left">
            <label htmlFor="person-select" className="mb-2">Persona</label>
            <select id="person-select" className="form-control shadow-sm" style={{ width: 200, appearance: 'menulist-button' }} value={personSelected} onChange={(e) => setPersonSelected(e.target.value)}>
              <option key={'none'} value={''}>Todos</option>
              {personsList.map((person: any, index: any) => (
                <option key={index} value={person}>{person}</option>
              ))}
            </select>
          </div>
          <div className="d-flex flex-column align-items-left">
            <label htmlFor="person-select" className="mb-2">Relación</label>
            <select id="relationship-select" className="form-control shadow-sm" style={{ width: 200, appearance: 'menulist-button' }} value={relationshipSelected} onChange={(e) => setRelationshipSelected(e.target.value)}>
              <option key={'none'} value={''}>Todos</option>
              {relationshipsList.map((relationship: any, index: any) => (
                <option key={index} value={relationship}>{relationship}</option>
              ))}
            </select>
          </div>
          <div className="d-flex flex-column align-items-left">
            <label htmlFor="person-select" className="mb-2">Película</label>
            <select id="movie-select" className="form-control shadow-sm" style={{ width: 200, appearance: 'menulist-button' }} value={movieSelected} onChange={(e) => setMovieSelected(e.target.value)}>
              <option key={'none'} value={''}>Todos</option>
              {moviesList.map((movie: any, index: any) => (
                <option key={index} value={movie}>{movie}</option>
              ))}
            </select>
          </div>
          <div className="d-flex flex-column align-items-left">
            <label htmlFor="year-select" className="mb-2">Desde año</label>
            <select id="year-select" className="form-control shadow-sm" style={{ width: 100, appearance: 'menulist-button' }} value={yearSelected} onChange={(e) => setYearSelected(e.target.value)}>
              <option key={'none'} value={''}>Todos</option>
              {yearsList.map((year: any, index: any) => (
                <option key={index} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="d-flex flex-column align-items-left justify-content-end">
            <button className="btn btn-primary shadow-md h-50 d-flex justify-content-center align-items-center" onClick={onClickReset}>Borrar Filtros</button>
          </div>
        </div>
        <div className="d-flex justify-content-around w-100 mt-4">
          <div className="d-flex flex-column align-items-left">
            <label htmlFor="order-person-select" className="mb-2">Ordenar por Persona</label>
            <select id="order-person-select" className="form-control shadow-sm" style={{ width: 200, appearance: 'menulist-button' }} value={orderPersonSelected} onChange={(e) => setOrderPersonSelected(e.target.value)}>
              <option key={'none'} value={''}>No</option>
              <option key={'asc'} value={'ASC'}>Ascendente</option>
              <option key={'desc'} value={'DESC'}>Descendente</option>
            </select>
          </div>
          <div className="d-flex flex-column align-items-left">
            <label htmlFor="order-movie-select" className="mb-2">Ordenar por Pelicula</label>
            <select id="order-movie-select" className="form-control shadow-sm" style={{ width: 200, appearance: 'menulist-button' }} value={orderMovieSelected} onChange={(e) => setOrderMovieSelected(e.target.value)}>
              <option key={'none'} value={''}>No</option>
              <option key={'asc'} value={'ASC'}>Ascendente</option>
              <option key={'desc'} value={'DESC'}>Descendente</option>
            </select>
          </div>
        </div>
      </div>
      <div className="table-container p-4 mt-4 d-flex justify-content-center align-items-start">
        <table className="table table-striped table-bordered shadow-sm">
          <thead>
            <tr>
              <th className="text-center">Persona</th>
              <th className="text-center">Relacion</th>
              <th className="text-center">
                <div className="d-flex flex-column">
                  <div>Película</div>
                  <div className="d-flex justify-content-around border-top">
                    <span className="text-center mt-2" style={{ width: 200 }}>Titulo</span>
                    <span className="text-center mt-2" style={{ width: 200 }}>Lema</span>
                    <span className="text-center mt-2" style={{ width: 50 }}>Lanzamiento</span>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? rows.map((row: any, index: any) => (
              <tr key={index}>
                <td>{row.Person}</td>
                <td>{row.Relationship}</td>
                <td>
                  <div className="d-flex flex-column">
                    <div className="d-flex justify-content-around">
                      <span className="text-center" style={{ width: 200 }}>{row.Movie}</span>
                      <span className="text-center" style={{ width: 200 }}>{row.Tagline}</span>
                      <span className="text-center" style={{ width: 50 }}>{row.Released}</span>
                    </div>
                  </div>
                </td>
              </tr>
            ))
              :
              <tr>
                <td colSpan={3} style={{ height: 100 }}>
                  <div className="d-flex justify-content-center align-items-center h-100">
                    {loading ? (
                      <div className="spinner-border text-primary" role="status">
                        {/* <span className="sr-only">Cargando...</span> */}
                      </div>
                    ) : (
                      <div className="d-flex justify-content-center align-items-center h-100">
                        Sin resultados
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div className="table-container p-4 mt-4 d-flex justify-content-center align-items-start">
        <div className="d-flex justify-content-around" style={{ maxWidth: '600px' }}>
          <div className="card shadow-sm p-3 mb-5 bg-white rounded">
            <h3 className="text-center">Consulta realizada</h3>
            <hr className="mb-3 border-top border-secondary" />
            <pre className="text-break" style={{ whiteSpace: 'pre-wrap' }}>
              {queryShow}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

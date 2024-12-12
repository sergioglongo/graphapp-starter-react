import React, { useState, useEffect, useCallback } from 'react';
import { useReadCypher } from 'use-neo4j';

const App = () => {
  const [rows, setRows] = useState<any>([]);
  const [personSelected, setPersonSelected] = useState<string>('Keanu Reeves');
  const [movieSelected, setMovieSelected] = useState<string>('');
  const [relationshipSelected, setRelationshipSelected] = useState<string>('ACTED_IN');

const { loading, result: queryresult, run, error } = useReadCypher(`
  MATCH (p:Person)-[d]->(m:Movie)
  WHERE (COALESCE($relationshipSelected, '') = '' OR TYPE(d) = $relationshipSelected) AND
        (COALESCE($personSelected, '') = '' OR p.name = $personSelected) AND
        (COALESCE($movieSelected, '') = '' OR m.title = $movieSelected)
  RETURN p, d, m
`, { personSelected, movieSelected, relationshipSelected });

  const [moviesList, setMoviesList] = useState<any>([]);
  const [personsList, setPersonsList] = useState<any>([]);
  const [relationshipsList, setRelationshipsList] = useState<any>([]);

  // Ejecutar una consulta con `useReadCypher`
  const { loading: loadingPersons, result: resultPersons, error: errorPersons } = useReadCypher(
    `MATCH (p:Person) RETURN p`
  );
  const { loading: loadingMovies, result: resultMovies, error: errorMovies } = useReadCypher(
    `MATCH (m:Movie) RETURN m`
  );
  const { loading: loadingRelationships, result: resultRelationships, error: errorRelationships } = useReadCypher(
    `MATCH ()-[r]->() RETURN COLLECT(DISTINCT TYPE(r)) AS tipos`
  );

  // const { loading, result: queryresult, error } = useReadCypher(query, {});

  // Memorizar `processInfo` para evitar renders infinitos
  const processInfo = useCallback((record: any) => {
    const person = record.get('p'); // Nodo `p` (Person)
    const relationship = record.get('d'); // Relación `d` (DIRECTED)
    const movie = record.get('m'); // Nodo `m` (Movie)

    return {
      Person: person?.properties?.name || 'Unknown',
      Relationship: relationship?.type || 'Unknown',
      Movie: movie?.properties?.title || 'Unknown',
      Released: movie?.properties?.released?.low || 'N/A',
    };
  }, []);

  // Ejecutar `processInfo` cuando los datos estén disponibles
  useEffect(() => {
    if (!loading && queryresult) {
      console.log("summary", queryresult?.summary);
      console.log("calculado", queryresult?.summary?.query?.text);

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
      setRelationshipsList(processed);
    }
  }, [loadingRelationships, resultRelationships])

  useEffect(() => {
    console.log("personSelected run", personSelected);
    run({ personSelected, movieSelected,relationshipSelected });
  }, [personSelected, movieSelected,relationshipSelected])

  return (
    <div>

      <div>
        <div>
          <select id="person-select" value={personSelected} onChange={(e) => setPersonSelected(e.target.value)}>
            <option key={'none'} value={''}>Todos</option>
            {personsList.map((person: any, index: any) => (
              <option key={index} value={person}>{person}</option>
            ))}
          </select>
          <select id="relationship-select" value={relationshipSelected} onChange={(e) => setRelationshipSelected(e.target.value)}>
            <option key={'none'} value={''}>Todos</option>
            {relationshipsList.map((relationship: any, index: any) => (
              <option key={index} value={relationship}>{relationship}</option>
            ))}
          </select>
          <select id="movie-select" value={movieSelected} onChange={(e) => setMovieSelected(e.target.value)}>
            <option key={'none'} value={''}>Todos</option>
            {moviesList.map((movie: any, index: any) => (
              <option key={index} value={movie}>{movie}</option>
            ))}
          </select>
        </div>
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Relationship</th>
              <th>Movie</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 && rows.map((row: any, index: any) => (
              <tr key={index}>
                <td>{row.Person}</td>
                <td>{row.Relationship}</td>
                <td>{row.Movie}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default App;

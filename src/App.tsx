import React, { useState, useEffect, useCallback } from 'react';
import { useReadCypher } from 'use-neo4j';

const App = () => {
  const [rows, setRows] = useState<any>([]);

  // Ejecutar una consulta con `useReadCypher`
  const { loading, result, error } = useReadCypher(`
    MATCH (p:Person {name: "Tom Hanks"})-[d:ACTED_IN]->(m:Movie)
    WHERE m.released > 2005
    RETURN p, d, m
  `);

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
    if (!loading && result) {
      const processed = result.records.map((record: any) => processInfo(record));
      setRows(processed);
    }
    if (error) console.error('Error ejecutando la consulta:', error);
  }, [loading, result, processInfo, error]);

  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : rows.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Relationship</th>
              <th>Movie</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, index: any) => (
              <tr key={index}>
                <td>{row.Person}</td>
                <td>{row.Relationship}</td>
                <td>{row.Movie}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No data available</p>
      )}
    </div>
  );
};

export default App;

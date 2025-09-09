import Papa from 'papaparse';
import { Participant } from '../types';

type ImportMode = 'nama' | 'bib';

export const importFromFile = (file: File, mode: ImportMode = 'nama'): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        
        if (file.name.endsWith('.csv')) {
          Papa.parse(content, {
            header: true, // Parse with headers to get column names
            skipEmptyLines: true,
            dynamicTyping: false, // Keep everything as strings
            complete: (results) => {
              try {
                const data = results.data as any[];
                const names: string[] = [];
                
                if (data.length > 0) {
                  // Get the headers/column names
                  const headers = Object.keys(data[0]);
                  
                  let targetColumn: string | undefined;
                  
                  if (mode === 'nama') {
                    // Find the name column (case insensitive)
                    targetColumn = headers.find(header => 
                      header.toLowerCase().includes('nama') || 
                      header.toLowerCase().includes('name') ||
                      header.toLowerCase() === 'nama' ||
                      header.toLowerCase() === 'name'
                    );
                  } else if (mode === 'bib') {
                    // Find the BIB column (case insensitive)
                    targetColumn = headers.find(header => 
                      header.toLowerCase().includes('bib') || 
                      header.toLowerCase() === 'bib' ||
                      header.toLowerCase().includes('nomor') ||
                      header.toLowerCase().includes('number')
                    );
                  }
                  
                  if (targetColumn) {
                    // Extract data from the identified column
                    data.forEach(row => {
                      const value = String(row[targetColumn!] || '').trim();
                      if (value.length > 0) {
                        // For BIB mode, format as "BIB {number}" if it's just a number
                        if (mode === 'bib' && /^\d+$/.test(value)) {
                          names.push(`BIB ${value.padStart(4, '0')}`);
                        } else {
                          names.push(value);
                        }
                      }
                    });
                  } else {
                    // If target column not found, try to use the first column as fallback
                    const firstColumn = headers[0];
                    if (firstColumn) {
                      data.forEach(row => {
                        const value = String(row[firstColumn] || '').trim();
                        if (value.length > 0) {
                          if (mode === 'bib' && /^\d+$/.test(value)) {
                            names.push(`BIB ${value.padStart(4, '0')}`);
                          } else {
                            names.push(value);
                          }
                        }
                      });
                    }
                  }
                }
                
                if (names.length === 0) {
                  const expectedColumn = mode === 'nama' ? '"nama" atau "name"' : '"bib" atau "nomor"';
                  reject(new Error(`Tidak ditemukan data yang valid dalam file CSV. Pastikan Anda memiliki kolom ${expectedColumn}.`));
                } else {
                  // Remove duplicates
                  const uniqueNames = [...new Set(names)];
                  resolve(uniqueNames);
                }
              } catch (error) {
                reject(new Error('Error parsing CSV data: ' + (error as Error).message));
              }
            },
            error: (error) => {
              reject(new Error('CSV parsing error: ' + error.message));
            }
          });
        } else {
          // Handle .txt files - assume each line is a name or BIB
          const lines = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
          
          const names: string[] = [];
          
          lines.forEach(line => {
            if (mode === 'bib' && /^\d+$/.test(line)) {
              names.push(`BIB ${line.padStart(4, '0')}`);
            } else {
              names.push(line);
            }
          });
            
          if (names.length === 0) {
            reject(new Error('Tidak ditemukan data yang valid dalam file teks.'));
          } else {
            // Remove duplicates
            const uniqueNames = [...new Set(names)];
            resolve(uniqueNames);
          }
        }
      } catch (error) {
        reject(new Error('Gagal memproses file: ' + (error as Error).message));
      }
    };
    
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsText(file, 'UTF-8'); // Specify encoding to handle special characters
  });
};

export const exportToCsv = (participants: Participant[], winners: Participant[]) => {
  const csvContent = [
    ['Winner Name', 'Prize Name', 'Prize Image', 'Draw Time'],
    ...winners.map(w => [
      w.name, 
      (w as any).prizeName || 'No Prize', 
      (w as any).prizeImage || 'No Image',
      new Date((w as any).wonAt || w.addedAt).toLocaleString()
    ]),
    [''],
    ['Remaining Participants'],
    ...participants.map(p => [p.name, '', '', new Date(p.addedAt).toLocaleString()])
  ];

  const csv = Papa.unparse(csvContent);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bayan-run-2025-doorprize-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
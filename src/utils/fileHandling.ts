import Papa from 'papaparse';
import { Participant } from '../types';

export const importFromFile = (file: File): Promise<string[]> => {
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
                  
                  // Find the name column (case insensitive)
                  const nameColumn = headers.find(header => 
                    header.toLowerCase().includes('nama') || 
                    header.toLowerCase().includes('name') ||
                    header.toLowerCase() === 'nama' ||
                    header.toLowerCase() === 'name'
                  );
                  
                  if (nameColumn) {
                    // Extract names from the identified column
                    data.forEach(row => {
                      const name = String(row[nameColumn] || '').trim();
                      if (name.length > 0) {
                        names.push(name);
                      }
                    });
                  } else {
                    // If no name column found, try to use the first column
                    const firstColumn = headers[0];
                    if (firstColumn) {
                      data.forEach(row => {
                        const name = String(row[firstColumn] || '').trim();
                        if (name.length > 0) {
                          names.push(name);
                        }
                      });
                    }
                  }
                }
                
                if (names.length === 0) {
                  reject(new Error('No valid names found in the CSV file. Make sure you have a column named "nama" or "name".'));
                } else {
                  resolve(names);
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
          // Handle .txt files - assume each line is a name
          const names = content
            .split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0);
            
          if (names.length === 0) {
            reject(new Error('No valid names found in the text file.'));
          } else {
            resolve(names);
          }
        }
      } catch (error) {
        reject(new Error('Failed to process file: ' + (error as Error).message));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
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
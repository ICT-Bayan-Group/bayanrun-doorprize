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
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
            complete: (results) => {
              try {
                const data = results.data as any[];
                const participants: string[] = [];
                
                if (data.length > 0) {
                  // Get the headers/column names
                  const headers = Object.keys(data[0]);
                  
                  // Find name column (case insensitive)
                  const nameColumn = headers.find(header => 
                    header.toLowerCase().includes('nama') || 
                    header.toLowerCase().includes('name') ||
                    header.toLowerCase() === 'nama' ||
                    header.toLowerCase() === 'name'
                  );
                  
                  // Find BIB column (case insensitive)
                  const bibColumn = headers.find(header => 
                    header.toLowerCase().includes('bib') || 
                    header.toLowerCase() === 'bib' ||
                    header.toLowerCase().includes('nomor') ||
                    header.toLowerCase().includes('number')
                  );
                  
                  data.forEach(row => {
                    let participantName = '';
                    let bibNumber = '';
                    
                    // Get name
                    if (nameColumn) {
                      const nameValue = String(row[nameColumn] || '').trim();
                      if (nameValue.length > 0) {
                        participantName = nameValue;
                      }
                    }
                    
                    // Get BIB
                    if (bibColumn) {
                      const bibValue = String(row[bibColumn] || '').trim();
                      if (bibValue.length > 0) {
                        // Format BIB number if it's numeric
                        if (/^\d+$/.test(bibValue)) {
                          bibNumber = `${bibValue.padStart(4, '0')}`;
                        } else {
                          bibNumber = bibValue;
                        }
                      }
                    }
                    
                    // Combine name and BIB
                    if (participantName && bibNumber) {
                      participants.push(`${participantName} (${bibNumber})`);
                    } else if (participantName) {
                      participants.push(participantName);
                    } else if (bibNumber) {
                      participants.push(bibNumber);
                    }
                  });
                  
                  // If no name or BIB columns found, try first column as fallback
                  if (participants.length === 0 && headers.length > 0) {
                    const firstColumn = headers[0];
                    data.forEach(row => {
                      const value = String(row[firstColumn] || '').trim();
                      if (value.length > 0) {
                        // Check if it's a number (treat as BIB)
                        if (/^\d+$/.test(value)) {
                          participants.push(`${value.padStart(4, '0')}`);
                        } else {
                          participants.push(value);
                        }
                      }
                    });
                  }
                }
                
                if (participants.length === 0) {
                  reject(new Error('Tidak ditemukan data yang valid dalam file CSV. Pastikan file memiliki kolom "nama"/"name" atau "bib"/"nomor".'));
                } else {
                  // Remove duplicates
                  const uniqueParticipants = [...new Set(participants)];
                  resolve(uniqueParticipants);
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
          
          const participants: string[] = [];
          
          lines.forEach(line => {
            // Check if line is purely numeric (treat as BIB)
            if (/^\d+$/.test(line)) {
              participants.push(`BIB ${line.padStart(4, '0')}`);
            } else {
              participants.push(line);
            }
          });
            
          if (participants.length === 0) {
            reject(new Error('Tidak ditemukan data yang valid dalam file teks.'));
          } else {
            // Remove duplicates
            const uniqueParticipants = [...new Set(participants)];
            resolve(uniqueParticipants);
          }
        }
      } catch (error) {
        reject(new Error('Gagal memproses file: ' + (error as Error).message));
      }
    };
    
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsText(file, 'UTF-8');
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
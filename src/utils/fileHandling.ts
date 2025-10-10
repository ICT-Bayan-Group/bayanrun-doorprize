import Papa from 'papaparse';
import { Participant } from '../types';

// Interface untuk data yang diimport dengan informasi tambahan
interface ImportedParticipantData {
  name: string;
  phone?: string;
  email?: string;
}

// Update return type untuk include phone dan email
export const importFromFile = (file: File): Promise<ImportedParticipantData[]> => {
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
                const participants: ImportedParticipantData[] = [];
                
                if (data.length > 0) {
                  // Get the headers/column names and trim whitespace
                  const headers = Object.keys(data[0]).map(h => h.trim());
                  
                  // Find name column (case insensitive)
                  const nameColumn = headers.find(header => 
                    header.toLowerCase().includes('nama') || 
                    header.toLowerCase().includes('name')
                  );
                  
                  // Find BIB column (case insensitive)
                  const bibColumn = headers.find(header => 
                    header.toLowerCase().includes('bib') || 
                    header.toLowerCase().includes('nomor') ||
                    header.toLowerCase().includes('number')
                  );
                  
                  // Find phone column (case insensitive)
                  const phoneColumn = headers.find(header => 
                    header.toLowerCase().includes('phone') || 
                    header.toLowerCase().includes('telepon') ||
                    header.toLowerCase().includes('hp') ||
                    header.toLowerCase().includes('wa') ||
                    header.toLowerCase().includes('whatsapp') ||
                    header.toLowerCase().includes('no_hp') ||
                    header.toLowerCase().includes('nohp')
                  );
                  
                  // Find email column (case insensitive)
                  const emailColumn = headers.find(header => 
                    header.toLowerCase().includes('email') || 
                    header.toLowerCase().includes('e-mail') ||
                    header.toLowerCase().includes('mail')
                  );
                  
                  data.forEach(row => {
                    let participantName = '';
                    let bibNumber = '';
                    let phone: string | undefined = undefined;
                    let email: string | undefined = undefined;
                    
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
                          bibNumber = bibValue.padStart(4, '0');
                        } else {
                          bibNumber = bibValue;
                        }
                      }
                    }
                    
                    // Get phone (only if column exists and has value)
                    if (phoneColumn && row[phoneColumn]) {
                      const phoneValue = String(row[phoneColumn]).trim();
                      if (phoneValue.length > 0 && phoneValue !== '-' && phoneValue !== 'undefined') {
                        phone = phoneValue;
                      }
                    }
                    
                    // Get email (only if column exists and has value)
                    if (emailColumn && row[emailColumn]) {
                      const emailValue = String(row[emailColumn]).trim();
                      if (emailValue.length > 0 && emailValue !== '-' && emailValue !== 'undefined') {
                        email = emailValue;
                      }
                    }
                    
                    // Create participant with name and BIB combined
                    if (participantName || bibNumber) {
                      const displayName = participantName && bibNumber 
                        ? `${participantName} (${bibNumber})`
                        : participantName || bibNumber;
                      
                      const participantData: ImportedParticipantData = {
                        name: displayName
                      };
                      
                      // Only add phone if it exists
                      if (phone) {
                        participantData.phone = phone;
                      }
                      
                      // Only add email if it exists
                      if (email) {
                        participantData.email = email;
                      }
                      
                      participants.push(participantData);
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
                          participants.push({
                            name: value.padStart(4, '0')
                          });
                        } else {
                          participants.push({
                            name: value
                          });
                        }
                      }
                    });
                  }
                }
                
                if (participants.length === 0) {
                  reject(new Error('Tidak ditemukan data yang valid dalam file CSV. Pastikan file memiliki kolom "nama"/"name" atau "bib"/"nomor".'));
                } else {
                  resolve(participants);
                }
              } catch (error) {
                reject(new Error('Error parsing CSV data: ' + (error as Error).message));
              }
            },
            error: (error: { message: string; }) => {
              reject(new Error('CSV parsing error: ' + error.message));
            }
          });
        } else {
          // Handle .txt files - assume each line is a name or BIB
          const lines = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
          
          const participants: ImportedParticipantData[] = [];
          
          lines.forEach(line => {
            // Check if line is purely numeric (treat as BIB)
            if (/^\d+$/.test(line)) {
              participants.push({
                name: `BIB ${line.padStart(4, '0')}`
              });
            } else {
              participants.push({
                name: line
              });
            }
          });
            
          if (participants.length === 0) {
            reject(new Error('Tidak ditemukan data yang valid dalam file teks.'));
          } else {
            resolve(participants);
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

// Helper function to extract BIB from name string
const extractBIB = (name: string): string => {
  const bibMatch = name.match(/\((\d+)\)$/);
  return bibMatch ? bibMatch[1] : '';
};

// Helper function to extract name without BIB
const extractName = (fullName: string): string => {
  return fullName.replace(/\s*\(\d+\)$/, '').trim();
};

// Export to CSV with phone and email support
export const exportToCsv = (participants: Participant[], winners: any[]) => {
  const csvContent = [
    ['Winner Name', 'BIB', 'Phone', 'Email', 'Prize Name', 'Draw Time'],
    ...winners.map(w => {
      const cleanName = extractName(w.name);
      const bibNumber = extractBIB(w.name);
      return [
        cleanName,
        bibNumber,
        w.phone || '-',
        w.email || '-',
        w.prizeName || 'No Prize',
        new Date(w.wonAt).toLocaleString('id-ID')
      ];
    }),
    [''],
    ['Remaining Participants', 'BIB', 'Phone', 'Email', '', 'Added At'],
    ...participants.map(p => {
      const cleanName = extractName(p.name);
      const bibNumber = extractBIB(p.name);
      return [
        cleanName,
        bibNumber,
        (p as any).phone || '-',
        (p as any).email || '-',
        '',
        new Date(p.addedAt).toLocaleString('id-ID')
      ];
    })
  ];

  const csv = Papa.unparse(csvContent);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bayan-run-2025-doorprize-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
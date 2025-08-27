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
            complete: (results) => {
              const names = results.data
                .flat()
                .map((name: any) => String(name).trim())
                .filter(name => name.length > 0);
              resolve(names);
            },
            error: (error) => reject(error)
          });
        } else {
          // Handle .txt files
          const names = content
            .split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0);
          resolve(names);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

export const exportToCsv = (participants: Participant[], winners: Participant[]) => {
  const csvContent = [
    ['Participants'],
    ...participants.map(p => [p.name]),
    [''],
    ['Winners'],
    ...winners.map(w => [w.name, new Date(w.addedAt).toLocaleString()])
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
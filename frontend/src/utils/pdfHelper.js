import jsPDF from 'jspdf';

// Función para cargar imagen como base64
export const loadImageAsBase64 = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
};

// Función para agregar logo en el membrete
export const addLogoHeader = async (doc, logoUrl) => {
  try {
    const logoBase64 = await loadImageAsBase64(logoUrl);

    // Agregar logo en la esquina superior izquierda (más alto que ancho)
    const logoWidth = 30;
    const logoHeight = 45;
    doc.addImage(logoBase64, 'PNG', 10, 10, logoWidth, logoHeight);

    // Agregar texto al lado del logo
    doc.setFontSize(12);
    doc.setTextColor(0, 51, 102);
    doc.text('IUJO - Instituto Universitario Jesús Obrero', 45, 20);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Sistema de Control de Asistencia', 45, 26);

    // Línea separadora
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.5);
    doc.line(10, 50, 200, 50);

    return 50; // Retornar la posición Y después del header
  } catch (error) {
    console.error('Error cargando logo:', error);
    // Si falla el logo, agregar header de texto simple
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('IUJO - Instituto Universitario Jesús Obrero', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Sistema de Control de Asistencia', 14, 28);
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.5);
    doc.line(10, 35, 200, 35);
    return 35;
  }
};

// Función para agregar marca de agua con imagen
export const addWatermark = async (doc, logoUrl) => {
  try {
    const logoBase64 = await loadImageAsBase64(logoUrl);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.saveGraphicsState();

    // Configurar transparencia para marca de agua
    doc.setGState(new doc.GState({ opacity: 0.15 }));

    // Agregar logo como marca de agua centrado y rotado (formato vertical: más alto que ancho)
    const watermarkWidth = 80;
    const watermarkHeight = 120;
    doc.addImage(logoBase64, 'PNG', (pageWidth - watermarkWidth) / 2, (pageHeight - watermarkHeight) / 2, watermarkWidth, watermarkHeight);

    doc.restoreGraphicsState();
  } catch (error) {
    console.error('Error agregando marca de agua:', error);
    // Fallback: marca de agua de texto
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.saveGraphicsState();
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(40);
    doc.setFont('helvetica', 'bold');
    doc.text('IUJO', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45
    });
    doc.restoreGraphicsState();
  }
};

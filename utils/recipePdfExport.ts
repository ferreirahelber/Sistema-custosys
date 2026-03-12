import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Recipe } from '../types';

export const exportAllRecipesToPDF = (recipes: Recipe[]) => {
  if (!recipes || recipes.length === 0) return;

  const doc = new jsPDF();
  
  recipes.forEach((recipe, index) => {
    // Se não for a primeira receita, adiciona nova página
    if (index > 0) {
      doc.addPage();
    }

    doc.setFontSize(18);
    // Título igual cabeçalho de PosReports, mas adaptado para fichas
    doc.text("Dodoce's - Fichas Técnicas", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Impresso em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);
    
    // Box Cinza para o Título da Receita
    doc.setFillColor(240, 240, 240);
    doc.rect(14, 34, 180, 25, 'F');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(recipe.name.toUpperCase(), 20, 44);
    
    // Categoria e Código
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const subtitle = [
      recipe.category ? `Categoria: ${recipe.category}` : '',
      recipe.barcode ? `Código: ${recipe.barcode}` : ''
    ].filter(Boolean).join(' | ');
    if (subtitle) {
      doc.text(subtitle, 20, 52);
    }

    // Informações de Rendimento e Tempo
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Informações de Produção", 14, 70);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tempo de Preparo: ${recipe.preparation_time_minutes} minutos`, 14, 78);
    
    const yieldText = recipe.is_base 
      ? `${recipe.yield_quantity} ${recipe.yield_unit}`
      : `${recipe.yield_units} unidades`;
    doc.text(`Rendimento: ${yieldText}`, 100, 78);

    // Tabela de Ingredientes
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Composição / Ingredientes", 14, 94);

    let startY = 98;

    autoTable(doc, {
      startY: startY,
      head: [['Ingrediente / Base', 'Quantidade', 'Custo Unit. (R$)', 'Custo Total (R$)']],
      body: recipe.items.map((item) => {
        let unitCost = 0;
        
        // Determinar custo unitário baseado no tipo
        if (item.item_type === 'recipe' && (item as any).sub_recipe) {
          unitCost = (item as any).sub_recipe.unit_cost || 0;
        } else if (item.ingredient) {
          unitCost = item.ingredient.unit_cost_base || 0;
        }

        const costTotalLine = item.quantity_used * unitCost;

        return [
          item.ingredient_name || 'Item Desconhecido',
          `${item.quantity_input} ${item.unit_input}`,
          unitCost.toFixed(4),
          costTotalLine.toFixed(2)
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85] }, // Cinza escuro
      styles: { fontSize: 9 },
    });

    // Bloco de Custos e Resumo Financeiro
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    // Verifica se cabe na página e se precisa quebrar (280 max aproximação fim da folha)
    let currentY = finalY;
    if (currentY > 260) {
      doc.addPage();
      currentY = 20;
    }

    // Painel Resumo Financeiro
    doc.setFillColor(248, 250, 252); // bg-slate-50
    doc.rect(14, currentY, 180, 45, 'F');
    doc.setDrawColor(203, 213, 225); // border-slate-300
    doc.rect(14, currentY, 180, 45, 'S');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Resumo Financeiro", 20, currentY + 10);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Mão de Obra: R$ ${recipe.total_cost_labor.toFixed(2)}`, 20, currentY + 20);
    doc.text(`Custos Fixos: R$ ${recipe.total_cost_overhead.toFixed(2)}`, 20, currentY + 28);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Custo da Receita (Lote): R$ ${recipe.total_cost_final.toFixed(2)}`, 100, currentY + 20);
    doc.text(`Custo Unitário Final: R$ ${recipe.unit_cost.toFixed(2)}`, 100, currentY + 28);
    
    if (recipe.selling_price) {
      doc.text(`Preço de Venda Sugerido: R$ ${recipe.selling_price.toFixed(2)}`, 100, currentY + 38);
    }
  });

  doc.save('todas_receitas_dodoce.pdf');
};

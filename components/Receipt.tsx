import React from 'react';
import { CartItem } from '../types';
import { QRCodeCanvas } from 'qrcode.react';

interface ReceiptProps {
  items: CartItem[];
  total: number;
  paymentMethod: string;
  date: Date;
  orderId?: string;
}

export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(
  ({ items, total, paymentMethod, date, orderId }, ref) => {
    const receiptUrl = orderId ? `https://app.custosys.com.br/comprovante/${orderId}` : 'https://app.custosys.com.br';

    return (
      <div ref={ref} id="receipt-area" className="hidden print:block p-4 bg-white text-black font-mono text-xs w-[80mm] mx-auto">

        {/* CABEÇALHO */}
        <div className="text-center border-b border-black pb-2 mb-2 border-dashed">
          <h1 className="font-bold text-lg uppercase">Dodoce's</h1>
          <p>Confeitaria Artesanal</p>
          <p className="text-[10px] mt-1">
            {date.toLocaleDateString('pt-BR')} - {date.toLocaleTimeString('pt-BR')}
          </p>
          {orderId && <p className="text-[10px]">Pedido #{String(orderId).slice(0, 8)}</p>}
        </div>

        {/* ITENS */}
        <table className="w-full text-left mb-2">
          <thead>
            <tr className="border-b border-black border-dashed">
              <th className="py-1">Qtd</th>
              <th className="py-1">Item</th>
              <th className="py-1 text-right">Vl.Tot</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td className="py-1 align-top w-8">{item.quantity}x</td>
                <td className="py-1 align-top">{item.name}</td>
                <td className="py-1 align-top text-right">
                  {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTAIS */}
        <div className="border-t border-black border-dashed pt-2 space-y-1">
          <div className="flex justify-between font-bold text-sm">
            <span>TOTAL</span>
            <span>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span>Forma Pagto:</span>
            <span>{paymentMethod}</span>
          </div>
        </div>

        {/* QR CODE COMPROVANTE */}
        {orderId && (
          <div className="mt-6 flex flex-col items-center justify-center border-t border-black border-dashed pt-6 pb-2">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeCanvas
                value={receiptUrl}
                size={160}
                level={"H"}
                fgColor="#000000"
                bgColor="#FFFFFF"
                includeMargin={true}
              />
            </div>
            <p className="text-[10px] mt-2 text-center font-bold">Aponte a câmera para o QR Code</p>
          </div>
        )}

        {/* RODAPÉ */}
        <div className="text-center mt-4 text-[10px]">
          <p>Obrigado pela preferência!</p>
          <p>Volte sempre.</p>
          <p className="mt-2 text-[8px] text-slate-500">Sistema Custosys</p>
        </div>
      </div>
    );
  }
);
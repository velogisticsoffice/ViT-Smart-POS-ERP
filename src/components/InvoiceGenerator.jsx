import jsPDF from "jspdf";

import autoTable from "jspdf-autotable";

export default function InvoiceGenerator() {

  const generatePDF = () => {

    const doc = new jsPDF();

    // Title
    doc.setFontSize(24);

    doc.text(
      "VEERASHAIVA ERP INVOICE",
      20,
      20
    );

    // Company Info
    doc.setFontSize(12);

    doc.text(
      "Veerashaiva ERP Pvt Ltd",
      20,
      35
    );

    doc.text(
      "Mangalore, Karnataka",
      20,
      42
    );

    doc.text(
      "Phone: +91 9876543210",
      20,
      49
    );

    // Invoice Details
    doc.text(
      "Invoice No: INV-1001",
      140,
      35
    );

    doc.text(
      `Date: ${new Date().toLocaleDateString()}`,
      140,
      42
    );

    // Table
    autoTable(doc, {
      startY: 60,

      head: [[
        "Product",
        "Category",
        "Price",
        "Qty",
        "Total",
      ]],

      body: [
        [
          "BLINKER Soda",
          "Beverage",
          "₹50",
          "10",
          "₹500",
        ],

        [
          "BICOJA Water",
          "Water",
          "₹20",
          "20",
          "₹400",
        ],

        [
          "Magic Cola",
          "Soft Drink",
          "₹30",
          "15",
          "₹450",
        ],
      ],
    });

    // Grand Total
    doc.setFontSize(18);

    doc.text(
      "Grand Total: ₹1350",
      140,
      150
    );

    // Footer
    doc.setFontSize(12);

    doc.text(
      "Thank you for your business!",
      20,
      280
    );

    // Save PDF
    doc.save(
      "VEERASHAIVA_INVOICE.pdf"
    );
  };

  return (
    <div className="bg-[#0b2f57] p-8 rounded-3xl border border-blue-800 mb-10">

      <h2 className="text-4xl font-bold mb-6">
        PDF Invoice Generator
      </h2>

      <p className="text-gray-400 text-xl mb-8">
        Generate professional ERP invoices.
      </p>

      <button
        onClick={generatePDF}
        className="bg-green-600 hover:bg-green-700 px-8 py-4 rounded-2xl text-2xl font-bold"
      >
        Generate Invoice PDF
      </button>

    </div>
  );
}